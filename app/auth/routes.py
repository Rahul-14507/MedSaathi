import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import bcrypt
from jose import JWTError, jwt
import uuid

from app.auth.cosmos import get_db

# Security config
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "generate_a_secure_random_key_here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/auth", tags=["auth"])

def verify_password(plain_password, hashed_password):
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Validates the JWT and returns the current user_id. Raises 401 if invalid."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    if username.startswith("PAT-"):
        from app.mediconnect import database as mediconnect_db
        patients = mediconnect_db.search_patients(username)
        if not patients:
            raise credentials_exception
        # Mock user object for the frontend
        return {"username": patients[0]["unique_id"]}

    # Check if user exists in CosmosDB
    db = get_db()
    users_container = db.get("users")
    if not users_container:
        raise HTTPException(status_code=500, detail="Database connection not initialized")

    query = "SELECT * FROM c WHERE c.id=@username"
    parameters = [{"name": "@username", "value": username}]
    user_list = list(users_container.query_items(query=query, parameters=parameters, enable_cross_partition_query=True))

    if not user_list:
        raise credentials_exception
        
    return user_list[0]

@router.post("/register")
async def register(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_db()
    users_container = db.get("users")
    if not users_container:
        raise HTTPException(status_code=500, detail="Database connection not initialized")

    # Check if user exists (using cross partition query for simplicity here)
    query = "SELECT * FROM c WHERE c.id=@username"
    parameters = [{"name": "@username", "value": form_data.username}]
    existing = list(users_container.query_items(query=query, parameters=parameters, enable_cross_partition_query=True))
    
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    hashed_password = get_password_hash(form_data.password)
    new_user = {
        "id": form_data.username, # Using username as partition key/ID for simplicity
        "username": form_data.username,
        "password_hash": hashed_password,
        "created_at": datetime.utcnow().isoformat()
    }
    
    try:
        users_container.create_item(body=new_user)
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": new_user["username"]}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "user": {"username": new_user["username"]}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {e}")


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username.startswith("PAT-"):
        if form_data.password != "password":
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        
        from app.mediconnect import database as mediconnect_db
        patients = mediconnect_db.search_patients(form_data.username)
        if not patients:
            raise HTTPException(status_code=401, detail="Incorrect username or password")
            
        patient = patients[0]
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": patient["unique_id"]}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "user": {"username": patient["unique_id"], "id": patient["id"]}}

    db = get_db()
    users_container = db.get("users")
    if not users_container:
        raise HTTPException(status_code=500, detail="Database connection not initialized")

    query = "SELECT * FROM c WHERE c.id=@username"
    parameters = [{"name": "@username", "value": form_data.username}]
    user_list = list(users_container.query_items(query=query, parameters=parameters, enable_cross_partition_query=True))

    if not user_list or not verify_password(form_data.password, user_list[0]["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = user_list[0]
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": {"username": user["username"], "id": user["id"]}}

async def get_current_user_optional(token: str = Depends(OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False))):
    """Returns the user object if authenticated, else returns None (Guest mode)."""
    if not token:
        return None
    try:
        return await get_current_user(token)
    except:
        return None
