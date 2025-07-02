import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Any
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, field_serializer
from pymongo import MongoClient
from bson import ObjectId
import jwt
from passlib.context import CryptContext
import logging
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Medexus API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/medexus')
client = MongoClient(MONGO_URL)
db = client.medexus

# Collections
users_collection = db.users
requests_collection = db.requests
interests_collection = db.interests

# Security setup
SECRET_KEY = "medexus-secret-key-2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Custom JSON encoder for MongoDB ObjectId
class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return json.JSONEncoder.default(self, o)

# Helper function to convert MongoDB documents to JSON-serializable format
def mongo_to_json(obj):
    if isinstance(obj, list):
        return [mongo_to_json(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: mongo_to_json(v) for k, v in obj.items()}
    elif isinstance(obj, ObjectId):
        return str(obj)
    return obj

security = HTTPBearer()

# Pydantic models
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str  # "hospital" or "doctor"

class UserCreate(UserBase):
    password: str
    institution_name: Optional[str] = None  # for hospitals
    specialization: Optional[str] = None    # for doctors
    bio: Optional[str] = None              # for doctors

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str
    institution_name: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None

class RequestBase(BaseModel):
    surgery_type: str
    required_specialization: str
    urgency: str  # "High", "Medium", "Low"
    date: str
    location: str
    hospital_name: str
    condition_description: Optional[str] = None

class RequestCreate(RequestBase):
    pass

class Request(RequestBase):
    id: str
    hospital_id: str
    created_at: str
    interested_doctors: Optional[List[dict]] = []

class InterestCreate(BaseModel):
    request_id: str

class Interest(BaseModel):
    id: str
    request_id: str
    doctor_id: str
    timestamp: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = users_collection.find_one({"id": user_id})
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Auth endpoints
@app.post("/api/auth/signup", response_model=Token)
async def signup(user: UserCreate):
    # Check if user exists
    existing_user = users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    if user.role not in ["hospital", "doctor"]:
        raise HTTPException(status_code=400, detail="Role must be 'hospital' or 'doctor'")
    
    # Validate required fields based on role
    if user.role == "hospital" and not user.institution_name:
        raise HTTPException(status_code=400, detail="Institution name required for hospitals")
    if user.role == "doctor" and not user.specialization:
        raise HTTPException(status_code=400, detail="Specialization required for doctors")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user.password)
    
    user_doc = {
        "id": user_id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "password_hash": hashed_password,
        "created_at": datetime.utcnow().isoformat()
    }
    
    if user.role == "hospital":
        user_doc["institution_name"] = user.institution_name
    else:
        user_doc["specialization"] = user.specialization
        user_doc["bio"] = user.bio or ""
    
    users_collection.insert_one(user_doc)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id}, expires_delta=access_token_expires
    )
    
    # Return user data without password
    user_data = {k: v for k, v in user_doc.items() if k != "password_hash"}
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": mongo_to_json(user_data)
    }

@app.post("/api/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    user = users_collection.find_one({"email": user_login.email})
    if not user or not verify_password(user_login.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    
    # Return user data without password
    user_data = {k: v for k, v in user.items() if k != "password_hash"}
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": mongo_to_json(user_data)
    }

@app.get("/api/auth/me")
async def get_current_user_info(current_user = Depends(get_current_user)):
    return {k: v for k, v in current_user.items() if k != "password_hash"}

# Request endpoints
@app.post("/api/requests", response_model=Request)
async def create_request(request: RequestCreate, current_user = Depends(get_current_user)):
    if current_user["role"] != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can create requests")
    
    request_id = str(uuid.uuid4())
    request_doc = {
        "id": request_id,
        "hospital_id": current_user["id"],
        "surgery_type": request.surgery_type,
        "required_specialization": request.required_specialization,
        "urgency": request.urgency,
        "date": request.date,
        "location": request.location,
        "hospital_name": request.hospital_name,
        "condition_description": request.condition_description or "",
        "created_at": datetime.utcnow().isoformat()
    }
    
    requests_collection.insert_one(request_doc)
    return request_doc

@app.get("/api/requests", response_model=List[Request])
async def get_requests(current_user = Depends(get_current_user)):
    if current_user["role"] == "hospital":
        # Hospital sees only their own requests with interested doctors
        requests = list(requests_collection.find({"hospital_id": current_user["id"]}))
        for request in requests:
            # Get interested doctors for each request
            interests = list(interests_collection.find({"request_id": request["id"]}))
            interested_doctors = []
            for interest in interests:
                doctor = users_collection.find_one({"id": interest["doctor_id"]})
                if doctor:
                    doctor_info = {
                        "id": doctor["id"],
                        "name": doctor["name"],
                        "specialization": doctor.get("specialization", ""),
                        "bio": doctor.get("bio", ""),
                        "email": doctor["email"]
                    }
                    interested_doctors.append(doctor_info)
            request["interested_doctors"] = interested_doctors
    else:
        # Doctors see all requests
        requests = list(requests_collection.find({}))
        for request in requests:
            # Add hospital info
            hospital = users_collection.find_one({"id": request["hospital_id"]})
            if hospital:
                request["hospital_name"] = hospital.get("institution_name", request.get("hospital_name", ""))
    
    return mongo_to_json(requests)

@app.get("/api/requests/{request_id}", response_model=Request)
async def get_request(request_id: str, current_user = Depends(get_current_user)):
    request = requests_collection.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Add interested doctors if user is the hospital owner
    if current_user["role"] == "hospital" and request["hospital_id"] == current_user["id"]:
        interests = list(interests_collection.find({"request_id": request_id}))
        interested_doctors = []
        for interest in interests:
            doctor = users_collection.find_one({"id": interest["doctor_id"]})
            if doctor:
                doctor_info = {
                    "id": doctor["id"],
                    "name": doctor["name"],
                    "specialization": doctor.get("specialization", ""),
                    "bio": doctor.get("bio", ""),
                    "email": doctor["email"]
                }
                interested_doctors.append(doctor_info)
        request["interested_doctors"] = interested_doctors
    
    return mongo_to_json(request)

@app.put("/api/requests/{request_id}", response_model=Request)
async def update_request(request_id: str, request_update: RequestCreate, current_user = Depends(get_current_user)):
    if current_user["role"] != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can update requests")
    
    existing_request = requests_collection.find_one({"id": request_id})
    if not existing_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if existing_request["hospital_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Can only update your own requests")
    
    update_data = {
        "surgery_type": request_update.surgery_type,
        "required_specialization": request_update.required_specialization,
        "urgency": request_update.urgency,
        "date": request_update.date,
        "location": request_update.location,
        "hospital_name": request_update.hospital_name,
        "condition_description": request_update.condition_description or "",
        "updated_at": datetime.utcnow().isoformat()
    }
    
    requests_collection.update_one({"id": request_id}, {"$set": update_data})
    updated_request = requests_collection.find_one({"id": request_id})
    return mongo_to_json(updated_request)

@app.delete("/api/requests/{request_id}")
async def delete_request(request_id: str, current_user = Depends(get_current_user)):
    if current_user["role"] != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can delete requests")
    
    existing_request = requests_collection.find_one({"id": request_id})
    if not existing_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if existing_request["hospital_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Can only delete your own requests")
    
    requests_collection.delete_one({"id": request_id})
    interests_collection.delete_many({"request_id": request_id})  # Clean up related interests
    
    return {"message": "Request deleted successfully"}

# Interest endpoints
@app.post("/api/interests", response_model=Interest)
async def express_interest(interest: InterestCreate, current_user = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can express interest")
    
    # Check if request exists
    request = requests_collection.find_one({"id": interest.request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Check if already interested
    existing_interest = interests_collection.find_one({
        "request_id": interest.request_id,
        "doctor_id": current_user["id"]
    })
    if existing_interest:
        raise HTTPException(status_code=400, detail="Already expressed interest in this request")
    
    interest_id = str(uuid.uuid4())
    interest_doc = {
        "id": interest_id,
        "request_id": interest.request_id,
        "doctor_id": current_user["id"],
        "timestamp": datetime.utcnow().isoformat()
    }
    
    interests_collection.insert_one(interest_doc)
    return interest_doc

@app.delete("/api/interests/{request_id}")
async def withdraw_interest(request_id: str, current_user = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can withdraw interest")
    
    result = interests_collection.delete_one({
        "request_id": request_id,
        "doctor_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Interest not found")
    
    return {"message": "Interest withdrawn successfully"}

@app.get("/api/interests/me")
async def get_my_interests(current_user = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors have interests")
    
    interests = list(interests_collection.find({"doctor_id": current_user["id"]}))
    
    # Get request details for each interest
    result = []
    for interest in interests:
        request = requests_collection.find_one({"id": interest["request_id"]})
        if request:
            hospital = users_collection.find_one({"id": request["hospital_id"]})
            request_with_hospital = {
                **request,
                "hospital_name": hospital.get("institution_name", "") if hospital else ""
            }
            result.append({
                "interest": interest,
                "request": request_with_hospital
            })
    
    return mongo_to_json(result)

# Seed data endpoint (for development)
@app.post("/api/seed-data")
async def seed_data():
    # Clear existing data
    users_collection.delete_many({})
    requests_collection.delete_many({})
    interests_collection.delete_many({})
    
    # Create hospital users
    hospitals = [
        {
            "id": str(uuid.uuid4()),
            "name": "Dr. Sarah Johnson",
            "email": "admin@cityhospital.com",
            "role": "hospital",
            "institution_name": "City General Hospital",
            "password_hash": get_password_hash("hospital123"),
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Dr. Michael Chen",
            "email": "admin@valleymed.com",
            "role": "hospital",
            "institution_name": "Valley Medical Center",
            "password_hash": get_password_hash("hospital123"),
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Dr. Emily Rodriguez",
            "email": "admin@regionalhospital.com",
            "role": "hospital",
            "institution_name": "Regional Health Hospital",
            "password_hash": get_password_hash("hospital123"),
            "created_at": datetime.utcnow().isoformat()
        }
    ]
    
    # Create doctor users
    doctors = [
        {
            "id": str(uuid.uuid4()),
            "name": "Dr. James Wilson",
            "email": "james.wilson@medexus.com",
            "role": "doctor",
            "specialization": "Orthopedic Surgeon",
            "bio": "15+ years experience in joint replacement and trauma surgery",
            "password_hash": get_password_hash("doctor123"),
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Dr. Lisa Anderson",
            "email": "lisa.anderson@medexus.com",
            "role": "doctor",
            "specialization": "Cardiologist",
            "bio": "Specialized in cardiac surgery and interventional cardiology",
            "password_hash": get_password_hash("doctor123"),
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Dr. Robert Kumar",
            "email": "robert.kumar@medexus.com",
            "role": "doctor",
            "specialization": "General Surgeon",
            "bio": "Expert in minimally invasive surgical techniques",
            "password_hash": get_password_hash("doctor123"),
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Dr. Maria Garcia",
            "email": "maria.garcia@medexus.com",
            "role": "doctor",
            "specialization": "Neurologist",
            "bio": "Specialized in neurosurgery and brain tumor treatments",
            "password_hash": get_password_hash("doctor123"),
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Dr. David Park",
            "email": "david.park@medexus.com",
            "role": "doctor",
            "specialization": "Orthopedic Surgeon",
            "bio": "Sports medicine and arthroscopic surgery specialist",
            "password_hash": get_password_hash("doctor123"),
            "created_at": datetime.utcnow().isoformat()
        }
    ]
    
    # Insert users
    users_collection.insert_many(hospitals + doctors)
    
    # Create sample surgery requests
    sample_requests = [
        {
            "id": str(uuid.uuid4()),
            "hospital_id": hospitals[0]["id"],
            "surgery_type": "Hip Replacement",
            "required_specialization": "Orthopedic Surgeon",
            "urgency": "High",
            "date": "2025-03-20",
            "location": "Springfield, IL",
            "hospital_name": "City General Hospital",
            "condition_description": "Elderly patient with severe hip arthritis requiring urgent replacement",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "hospital_id": hospitals[1]["id"],
            "surgery_type": "Cardiac Bypass",
            "required_specialization": "Cardiologist",
            "urgency": "Medium",
            "date": "2025-03-25",
            "location": "Madison, WI",
            "hospital_name": "Valley Medical Center",
            "condition_description": "Patient with blocked arteries needs bypass surgery",
            "created_at": datetime.utcnow().isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "hospital_id": hospitals[2]["id"],
            "surgery_type": "Appendectomy",
            "required_specialization": "General Surgeon",
            "urgency": "High",
            "date": "2025-03-15",
            "location": "Cedar Falls, IA",
            "hospital_name": "Regional Health Hospital",
            "condition_description": "Emergency appendectomy needed for acute appendicitis",
            "created_at": datetime.utcnow().isoformat()
        }
    ]
    
    requests_collection.insert_many(sample_requests)
    
    return {
        "message": "Seed data created successfully",
        "hospitals": len(hospitals),
        "doctors": len(doctors),
        "sample_requests": len(sample_requests),
        "login_info": {
            "hospital_login": {"email": "admin@cityhospital.com", "password": "hospital123"},
            "doctor_login": {"email": "james.wilson@medexus.com", "password": "doctor123"}
        }
    }

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)