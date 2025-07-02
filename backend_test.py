import requests
import unittest
import json
import uuid
from datetime import datetime, timedelta

class MedexusAPITester:
    def __init__(self, base_url="https://2b23255d-b211-490e-a6b8-85907df05c8a.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        
        if headers is None:
            headers = {'Content-Type': 'application/json'}
            if self.token:
                headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"Error details: {error_data}")
                except:
                    print(f"Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test the health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "/api/health",
            200
        )
        return success

    def test_hospital_login(self, email="admin@cityhospital.com", password="hospital123"):
        """Test hospital login"""
        success, response = self.run_test(
            "Hospital Login",
            "POST",
            "/api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"Logged in as hospital: {self.user_data['name']}")
            return True
        return False

    def test_doctor_login(self, email="james.wilson@medexus.com", password="doctor123"):
        """Test doctor login"""
        success, response = self.run_test(
            "Doctor Login",
            "POST",
            "/api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"Logged in as doctor: {self.user_data['name']}")
            return True
        return False

    def test_signup(self, role="doctor"):
        """Test signup functionality"""
        # Generate unique email to avoid conflicts
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        if role == "doctor":
            signup_data = {
                "name": "Test Doctor",
                "email": test_email,
                "password": "test123",
                "role": "doctor",
                "specialization": "Test Specialist",
                "bio": "Test bio for testing purposes"
            }
        else:
            signup_data = {
                "name": "Test Hospital Admin",
                "email": test_email,
                "password": "test123",
                "role": "hospital",
                "institution_name": "Test Hospital"
            }
        
        success, response = self.run_test(
            f"{role.capitalize()} Signup",
            "POST",
            "/api/auth/signup",
            200,
            data=signup_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"Created new {role} account: {test_email}")
            # Save test data for later use
            self.test_data['test_email'] = test_email
            self.test_data['test_password'] = "test123"
            return True
        return False

    def test_get_requests(self):
        """Test getting surgery requests"""
        success, response = self.run_test(
            "Get Requests",
            "GET",
            "/api/requests",
            200
        )
        if success:
            print(f"Retrieved {len(response)} surgery requests")
            if len(response) > 0:
                # Save first request for later tests
                self.test_data['test_request'] = response[0]
            return True
        return False

    def test_create_request(self):
        """Test creating a surgery request (hospital only)"""
        if self.user_data['role'] != 'hospital':
            print("⚠️ Skipping create request test - requires hospital role")
            return True
        
        request_data = {
            "surgery_type": "Test Surgery",
            "required_specialization": "Test Specialist",
            "urgency": "Medium",
            "date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "location": "Test Location",
            "hospital_name": self.user_data.get('institution_name', 'Test Hospital'),
            "condition_description": "Test condition for API testing"
        }
        
        success, response = self.run_test(
            "Create Request",
            "POST",
            "/api/requests",
            200,
            data=request_data
        )
        
        if success and 'id' in response:
            print(f"Created request with ID: {response['id']}")
            # Save for later tests
            self.test_data['created_request'] = response
            return True
        return False

    def test_update_request(self):
        """Test updating a surgery request (hospital only)"""
        if self.user_data['role'] != 'hospital' or 'created_request' not in self.test_data:
            print("⚠️ Skipping update request test - requires hospital role and created request")
            return True
        
        request_id = self.test_data['created_request']['id']
        update_data = {
            "surgery_type": "Updated Test Surgery",
            "required_specialization": "Updated Test Specialist",
            "urgency": "High",
            "date": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
            "location": "Updated Test Location",
            "hospital_name": self.user_data.get('institution_name', 'Test Hospital'),
            "condition_description": "Updated test condition"
        }
        
        success, response = self.run_test(
            "Update Request",
            "PUT",
            f"/api/requests/{request_id}",
            200,
            data=update_data
        )
        
        if success:
            print(f"Updated request: {response['surgery_type']}")
            return True
        return False

    def test_express_interest(self):
        """Test expressing interest in a request (doctor only)"""
        if self.user_data['role'] != 'doctor' or not self.test_data.get('test_request'):
            print("⚠️ Skipping express interest test - requires doctor role and available request")
            return True
        
        request_id = self.test_data['test_request']['id']
        
        success, response = self.run_test(
            "Express Interest",
            "POST",
            "/api/interests",
            200,
            data={"request_id": request_id}
        )
        
        if success:
            print(f"Expressed interest in request: {request_id}")
            # Save for withdraw test
            self.test_data['interest_request_id'] = request_id
            return True
        return False

    def test_get_my_interests(self):
        """Test getting doctor's interests"""
        if self.user_data['role'] != 'doctor':
            print("⚠️ Skipping get interests test - requires doctor role")
            return True
        
        success, response = self.run_test(
            "Get My Interests",
            "GET",
            "/api/interests/me",
            200
        )
        
        if success:
            print(f"Retrieved {len(response)} interests")
            return True
        return False

    def test_withdraw_interest(self):
        """Test withdrawing interest from a request (doctor only)"""
        if self.user_data['role'] != 'doctor' or not self.test_data.get('interest_request_id'):
            print("⚠️ Skipping withdraw interest test - requires doctor role and expressed interest")
            return True
        
        request_id = self.test_data['interest_request_id']
        
        success, response = self.run_test(
            "Withdraw Interest",
            "DELETE",
            f"/api/interests/{request_id}",
            200
        )
        
        if success:
            print(f"Withdrew interest from request: {request_id}")
            return True
        return False

    def test_delete_request(self):
        """Test deleting a surgery request (hospital only)"""
        if self.user_data['role'] != 'hospital' or 'created_request' not in self.test_data:
            print("⚠️ Skipping delete request test - requires hospital role and created request")
            return True
        
        request_id = self.test_data['created_request']['id']
        
        success, response = self.run_test(
            "Delete Request",
            "DELETE",
            f"/api/requests/{request_id}",
            200
        )
        
        if success:
            print(f"Deleted request: {request_id}")
            return True
        return False

    def test_role_based_access(self):
        """Test role-based access restrictions"""
        if self.user_data['role'] == 'hospital':
            # Hospital trying to express interest (should fail)
            success, _ = self.run_test(
                "Hospital Express Interest (should fail)",
                "POST",
                "/api/interests",
                403,
                data={"request_id": "some-request-id"}
            )
            return success
        else:
            # Doctor trying to create request (should fail)
            request_data = {
                "surgery_type": "Test Surgery",
                "required_specialization": "Test Specialist",
                "urgency": "Medium",
                "date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
                "location": "Test Location",
                "hospital_name": "Test Hospital",
                "condition_description": "Test condition"
            }
            success, _ = self.run_test(
                "Doctor Create Request (should fail)",
                "POST",
                "/api/requests",
                403,
                data=request_data
            )
            return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🏥 Starting Medexus API Tests 🏥")
        
        # Basic health check
        self.test_health_check()
        
        # Test hospital flow
        print("\n--- Testing Hospital Flow ---")
        if self.test_hospital_login():
            self.test_get_requests()
            self.test_create_request()
            self.test_update_request()
            self.test_role_based_access()
            self.test_delete_request()
        
        # Test doctor flow
        print("\n--- Testing Doctor Flow ---")
        if self.test_doctor_login():
            self.test_get_requests()
            self.test_express_interest()
            self.test_get_my_interests()
            self.test_withdraw_interest()
            self.test_role_based_access()
        
        # Test signup
        print("\n--- Testing Signup Flow ---")
        self.test_signup(role="doctor")
        
        # Print summary
        print("\n--- Test Summary ---")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run) * 100:.2f}%")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = MedexusAPITester()
    tester.run_all_tests()