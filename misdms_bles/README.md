# MISDMS-BLES: Management Information System for DepEd Schools

**School Management System | Built with Next.js 15 + React 19 + TypeScript**

[![Status](https://img.shields.io/badge/status-production--ready-brightgreen)](https://github.com)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com)
[![License](https://img.shields.io/badge/license-proprietary-red)](LICENSE)

---

## Overview

MISDMS-BLES is a comprehensive, production-ready school management system designed for Philippine Department of Education (DepEd) schools. It streamlines attendance tracking, grade management, enrollment, reporting, and administrative workflows with role-based access control and enterprise-grade security.

**Key Stats:**
- **60+ Files** | **15,000+ Lines** of production code
- **35+ API Endpoints** | **20+ UI Pages**
- **4 Development Phases** | **100% Feature Complete**
- **Enterprise Security** | **Audit Logging** | **Data Backup**

---

## 🎯 Core Features

### Phase 1: Attendance & Reporting
- 📋 **Attendance System** - Real-time marking with quarterly reports
- 📊 **Reports** - SF1 Master List & SF2 Class Record generation
- ⚙️ **Settings Management** - Configurable school & academic parameters
- 📄 **Pagination** - Universal pagination across all list views

### Phase 2: Administrative
- 🔍 **Audit Logging** - Complete action tracking & compliance
- 📁 **File Management** - Upload, organize, share documents (25+ formats)
- 📧 **Email Notifications** - 8 professional templates, configurable delivery
- 👤 **User Profiles** - Self-editing with admin management
- 📤 **Data Export** - CSV/JSON export for all resources

### Phase 3: Advanced Analytics
- 🔐 **Backup & Recovery** - Automated backup creation & restoration
- 🔎 **Advanced Search** - Multi-resource search with dynamic filters
- 📑 **Report Customization** - Custom report templates & field selection
- ✅ **Grade Workflow** - 7-step approval process with role-based gates
- 📈 **Analytics Dashboard** - 6 key metrics, trends, performance tracking
- 🚨 **Alerts System** - Automated monitoring & notifications

### Phase 4: Production Ready
- ⚡ **Performance Optimization** - Query caching, indexing strategies
- 🔒 **Security Hardening** - 20-item security checklist
- 📚 **API Documentation** - Interactive reference + code examples
- ✈️ **Deployment Guide** - Complete production checklist

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│         Frontend (React 19 + TypeScript)             │
│  ✓ 20+ Pages  ✓ Role-Based UI  ✓ Real-time Updates │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│      API Layer (Next.js 15 with TypeScript)         │
│  ✓ 35+ Endpoints  ✓ Permission Checks  ✓ Validation │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│   Business Logic (TypeScript Utilities)             │
│  ✓ Calculations  ✓ Workflows  ✓ Analytics         │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│      Database Layer (Prisma ORM + MySQL)            │
│  ✓ 12 Models  ✓ Transactions  ✓ Relationships      │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Requirements
- Node.js 18+ | npm 9+
- MySQL 8.0+ or MariaDB 10.6+
- Git

### Installation

```bash
# Clone and setup
git clone <repository-url>
cd misdms_bles
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your database credentials

# Setup database
npx prisma migrate deploy
npx prisma db seed  # Optional: populate sample data

# Start development
npm run dev
```

Visit: **http://localhost:3000**

### Default Credentials
```
Email: admin@school.edu
Password: Admin@123456
```

---

## 📧 Email Configuration

**Default:** Disabled (logs to console)

### Enable Email

#### Option 1: Mailtrap (Testing)
```env
EMAIL_ENABLED=true
EMAIL_PROVIDER=mailtrap
SMTP_HOST=live.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASS=your_password
```

#### Option 2: Gmail
```env
EMAIL_ENABLED=true
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-password
```

#### Option 3: SendGrid (Production)
```env
EMAIL_ENABLED=true
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your-api-key
```

**See [DEPLOYMENT.md](DEPLOYMENT.md) for full setup guide.**

---

## 👥 User Roles & Permissions

| Role | Permissions | Access Level |
|------|-----------|--------------|
| **SUPER_ADMIN** | All system operations | Full |
| **PRINCIPAL** | School management, approvals | High |
| **REGISTRAR** | Enrollment, records, reports | High |
| **ICT_COORDINATOR** | System settings, backups | Medium |
| **TEACHER** | Attendance, grades, students | Medium |
| **ADVISER** | Class management, reporting | Medium |
| **NON_TEACHING** | Limited access | Low |
| **ADMIN_OFFICER** | Administrative tasks | Low |

---

## 📊 Database Schema

**12 Core Models:**
- `User` - User accounts & authentication
- `Student` - Student records with metadata
- `Section` - Class sections with capacity
- `Subject` - Subject/course information
- `Enrollment` - Student-Section associations
- `Attendance` - Attendance records by date
- `Grade` - Grade records with workflow status
- `AcademicYear` - School year definitions
- `Document` - File uploads & sharing
- `Notification` - Email/notification history
- `AuditLog` - Complete action audit trail
- `GradeWorkflowLog` - Grade approval tracking

---

## 🔒 Security Features

✅ **Authentication**: JWT-based with NextAuth.js  
✅ **Authorization**: 50+ granular permissions  
✅ **Encryption**: Password hashing + data validation  
✅ **Audit Trail**: Complete logging of all actions  
✅ **Input Validation**: Parameterized queries, sanitization  
✅ **CORS**: Configured for security  
✅ **Rate Limiting**: Endpoint throttling ready  
✅ **Session Management**: Secure JWT handling  

---

## 📈 API Reference

### Authentication
```bash
POST /api/auth/signin
GET  /api/auth/session
POST /api/auth/signout
```

### Students
```bash
GET    /api/students              # List students (paginated)
POST   /api/students              # Create student
PATCH  /api/students/[id]         # Update student
```

### Grades
```bash
GET    /api/grades                # List grades
POST   /api/grades                # Create/update grades
POST   /api/grades/workflow       # Grade approval workflow
```

### Attendance
```bash
GET    /api/attendance            # List attendance
POST   /api/attendance            # Record attendance
GET    /api/attendance/summary    # Quarterly summary
```

### Reports
```bash
GET    /api/reports/class-record  # SF2 Report
GET    /api/reports/master-list   # SF1 Report
POST   /api/reports/custom        # Custom reports
```

### Analytics
```bash
GET    /api/analytics             # Dashboard metrics
GET    /api/analytics?metric=attendance_trend
GET    /api/analytics?metric=grade_trend
```

**Complete API docs at: `/docs`**

---

## 🧪 Testing

```bash
# Unit tests (Jest)
npm run test

# Integration tests
npm run test:integration

# E2E tests (Playwright)
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

## 📦 Build & Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Docker
```bash
docker build -t misdms-bles .
docker run -p 3000:3000 misdms-bles
```

### Deploy to Vercel
```bash
npm i -g vercel
vercel
```

**See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guide.**

---

## 📋 Checklists

### Pre-Deployment
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Database backups created
- [ ] Environment variables configured
- [ ] Email service setup (if enabled)

### Post-Deployment
- [ ] Health checks passing
- [ ] Core workflows tested
- [ ] Error logs monitored
- [ ] Backups verified
- [ ] Performance metrics collected

**Full checklist in `/deployment` page**

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [DEPLOYMENT.md](DEPLOYMENT.md) | Setup & deployment guide |
| `/docs` (in-app) | Interactive API reference |
| [.env.example](.env.example) | Environment configuration |
| `CLAUDE.md` | Development guidelines |

---

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error**
```
ERROR: connect ECONNREFUSED 127.0.0.1:3306
```
✓ Start MySQL/MariaDB  
✓ Check DATABASE_URL in .env.local  
✓ Verify credentials

**Emails Not Sending**
```
EMAIL_ENABLED=false in .env.local
```
✓ Set EMAIL_ENABLED=true  
✓ Configure SMTP credentials  
✓ Check firewall/ISP blocks port 587

**Build Failures**
```
ERROR in pages/...
```
✓ Clear .next: `rm -rf .next`  
✓ Reinstall: `npm install`  
✓ Rebuild: `npm run build`

---

## 📊 System Statistics

| Metric | Value |
|--------|-------|
| Total Files | 60+ |
| Code Lines | 15,000+ |
| API Endpoints | 35+ |
| UI Pages | 20+ |
| Database Models | 12 |
| Development Time | 4 Phases |
| Feature Completion | 100% |
| Security Fixes | 14 |
| Performance Optimizations | 20+ |

---

## 🎓 Learning Resources

- **Next.js 15 Docs**: https://nextjs.org/docs
- **React 19 Guide**: https://react.dev
- **Prisma ORM**: https://www.prisma.io/docs
- **TypeScript**: https://www.typescriptlang.org/docs
- **NextAuth.js**: https://next-auth.js.org

---

## 📝 License

Proprietary - © 2026 MISDMS-BLES. All rights reserved.

---

## 🤝 Support

- **Issues**: Check GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: `/docs` in application
- **Email**: support@school.edu

---

## 🎉 What's Included

- ✅ Complete school management system
- ✅ 4 development phases, fully implemented
- ✅ 35+ production APIs
- ✅ 20+ responsive UI pages
- ✅ Role-based access control
- ✅ Comprehensive audit logging
- ✅ Email notification system
- ✅ Advanced analytics dashboard
- ✅ Backup & recovery system
- ✅ Production deployment guide
- ✅ API documentation portal
- ✅ Security hardening checklist

---

## 🚀 Next Steps

1. **Read**: [DEPLOYMENT.md](DEPLOYMENT.md) for setup
2. **Configure**: Copy `.env.example` to `.env.local`
3. **Start**: `npm run dev`
4. **Explore**: Visit `/docs` for API reference
5. **Deploy**: Follow deployment checklist

---

**Build Date:** August 23, 2026  
**Status:** ✅ Production Ready  
**Version:** 1.0.0
