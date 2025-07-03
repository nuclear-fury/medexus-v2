# Medexus — Connecting Hospitals with Surgeons & Specialists  
*A Vibe-Coded App Built with Emergent AI*

> A comprehensive medical platform bridging the gap between under-resourced hospitals in Tier-2/3 regions and available medical specialists for surgical assistance.

---

## 🏥 Overview

Medexus addresses the critical challenge of surgical resource scarcity in smaller hospitals by creating a seamless connection between healthcare institutions and qualified specialists. The platform enables hospitals to post surgery requests and allows doctors to browse and express interest in opportunities where their expertise is needed.

It’s a practical, scalable way to bridge India’s healthcare gap — connecting hospitals in need with doctors ready to help.

---

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

---

## 🛠️ Technology Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI (Python) with JWT authentication
- **Database**: MongoDB with UUID-based document management
- **Security**: Role-based access control and secure API endpoints

---

## 🚀 Quick Start

### 🔗 Live Demo  
[Medexus Platform](https://medbridge.preview.emergentagent.com/)

### 🧪 Test Accounts

#### Hospital Accounts (Password: `hospital123`)
1. **City General Hospital** — `admin@cityhospital.com` (Dr. Sarah Johnson)  
2. **Valley Medical Center** — `admin@valleymed.com` (Dr. Michael Chen)  
3. **Regional Health Hospital** — `admin@regionalhospital.com` (Dr. Emily Rodriguez)

#### Doctor Accounts (Password: `doctor123`)
1. **Dr. James Wilson** — `james.wilson@medexus.com`  
   - Orthopedic Surgeon | 15+ years in joint & trauma surgery  
2. **Dr. Lisa Anderson** — `lisa.anderson@medexus.com`  
   - Cardiologist | Expert in cardiac and interventional surgery  
3. **Dr. Robert Kumar** — `robert.kumar@medexus.com`  
   - General Surgeon | Minimally invasive surgery specialist  
4. **Dr. Maria Garcia** — `maria.garcia@medexus.com`  
   - Neurologist | Focus on neurosurgery & brain tumor treatment  
5. **Dr. David Park** — `david.park@medexus.com`  
   - Orthopedic | Sports medicine and arthroscopic surgeon  

---

## 🧪 Sample Data

- 3 hospital accounts with different medical institutions  
- 5 fully profiled doctors across key specializations  
- Example surgery requests preloaded for demo/test usage  

---

## 🎯 Use Cases

- **Emergency Surgical Support** – Mobilize specialists quickly  
- **Specialist Discovery** – Hospitals access expertise they normally can’t afford full-time  
- **Urban-Rural Bridge** – Enable collaboration across cities  
- **Healthcare Efficiency** – Smarter utilization of surgeon time & talent  

---

## 🔒 Security

- 🔐 JWT-based authentication  
- 🔐 Role-based access control  
- 🔐 Secure API endpoints  
- 🔐 Access-restricted views & routes  

---

## 📱 Mobile Optimization

- Built mobile-first for hospitals with legacy devices  
- Works seamlessly on both smartphones and desktop  
- Touch-optimized UI  

---

## 🧑‍💻 Local Development

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
