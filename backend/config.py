from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

# Get the absolute path to the .env file
ENV_FILE = Path(__file__).parent / ".env"

# Load environment variables from .env file
load_dotenv(ENV_FILE)

class Settings(BaseSettings):
    # Database Configuration
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    class Config:
        env_file = ENV_FILE
        case_sensitive = True
        env_file_encoding = 'utf-8'

# Create global settings object
settings = Settings() 