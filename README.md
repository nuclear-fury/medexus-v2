# Medexus - Connecting Hospitals with Medical Specialists
A Vibe Coded App

> A comprehensive medical platform bridging the gap between under-resourced hospitals in Tier-2/3 regions and available medical specialists for surgical assistance.

## 🏥 Overview

Medexus addresses the critical challenge of surgical resource scarcity in smaller hospitals by creating a seamless connection between healthcare institutions and qualified specialists. The platform enables hospitals to post surgery requests and allows doctors to browse and express interest in opportunities where their expertise is needed.

## ✨ Features

### For Hospitals
- **Request Management**: Create, edit, and delete surgery requests with detailed specifications
- **Specialist Matching**: View interested doctors with their qualifications and contact information
- **Dashboard**: Comprehensive overview of all active requests and responses

### For Doctors
- **Opportunity Browse**: View all available surgery requests in a mobile-friendly feed
- **Smart Filtering**: Filter opportunities by surgery type, specialization, and urgency level
- **Interest Management**: Express interest in cases and manage your commitments
- **Profile Management**: Maintain professional profile with specialization and bio

### Core Functionality
- **Role-Based Authentication**: Secure signup/login for both hospitals and doctors
- **Real-Time Updates**: Instant notifications when doctors express interest
- **Mobile-First Design**: Responsive interface optimized for all devices
- **Contact Integration**: Direct email contact between hospitals and interested specialists

## 🛠️ Technology Stack

- **Frontend**: React.js with Tailwind CSS for responsive design
- **Backend**: FastAPI (Python) with JWT authentication
- **Database**: MongoDB with UUID-based document management
- **Security**: Role-based access control and secure API endpoints

## 🚀 Quick Start

### Live Demo
Access the application at: [Medexus Platform](https://your-demo-url.com)

### Test Accounts

**Hospital Login:**
- Email: `admin@cityhospital.com`
- Password: `hospital123`

**Doctor Login:**
- Email: `james.wilson@medexus.com`
- Password: `doctor123`

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/medexus.git
cd medexus

# Backend setup
cd backend
pip install -r requirements.txt
uvicorn server:app --reload

# Frontend setup
cd frontend
npm install
npm start
