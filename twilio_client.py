import os
from dotenv import load_dotenv

# Try to import twilio, but don't fail if it's not installed for the mock
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False

load_dotenv()

class TwilioFollowupClient:
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_PHONE_NUMBER")
        
        # If credentials exist and library is installed, use real Twilio
        self.use_mock = not (self.account_sid and self.auth_token and self.from_number and TWILIO_AVAILABLE)
        
        if not self.use_mock:
            self.client = Client(self.account_sid, self.auth_token)
        else:
            print("⚠️ Twilio credentials missing or library not installed. Running Follow-up Agent in MOCK mode. Messages will be printed to console.")

    def send_message(self, to_number, body):
        """Sends an SMS or WhatsApp message to a patient or doctor."""
        if self.use_mock:
            print("\n" + "="*50)
            print(f"📱 MOCK SMS SENT TO: {to_number}")
            print(f"✉️ MESSAGE:\n{body}")
            print("="*50 + "\n")
            return "mock_message_sid_12345"
        else:
            try:
                # To use WhatsApp, numbers must be prefixed with 'whatsapp:'
                # For this demo, we assume standard SMS if not specified, 
                # but the platform supports both via the same API.
                message = self.client.messages.create(
                    body=body,
                    from_=self.from_number,
                    to=to_number
                )
                print(f"✅ Real SMS sent to {to_number}. SID: {message.sid}")
                return message.sid
            except Exception as e:
                print(f"❌ Failed to send SMS via Twilio: {e}")
                return None

# Singleton instance for easy importing
twilio_agent = TwilioFollowupClient()

if __name__ == "__main__":
    # Test the client
    twilio_agent.send_message("+1234567890", "Hello! This is an automated check-in from your surgeon.")
