# Phase 5: Salary System (Lønn på Autopilot)

## Objective
Build a payroll system so simple that users only need to enter salary amounts.

## Deliverables

### 1. Employee Management
- Add/edit/remove employees
- Store: name, fødselsnummer (encrypted), position
- Track employment dates
- Handle part-time percentages

### 2. Tax Card Integration
- Fetch skattekort from Skatteetaten
- Handle table vs percentage deduction
- Auto-update when cards change
- Notify user of changes

### 3. Payroll Calculation Engine
- Gross to net calculation
- Tax deduction (skattetrekk)
- Employer contributions (arbeidsgiveravgift 14.1%)
- Vacation pay accrual (12% / 10.2%)
- OTP calculation (minimum 2%)

### 4. A-melding Generation
- Generate compliant A-melding XML
- Include all required fields
- Submit to Altinn
- Store receipts

### 5. Payslip Generation
- PDF payslips with all legal fields
- Email to employees
- Archive in system

### 6. Vacation Pay Tracking
- Visual accrual through year
- June payout calculation
- Custom schedule support

### 7. OTP Reporting
- Connect to pension providers
- Calculate contributions
- Generate reports

## Success Criteria
- [ ] Payroll runs with one click
- [ ] A-melding submits successfully
- [ ] Employees receive payslips
- [ ] Tax calculations are accurate
- [ ] Fødselsnummer is encrypted separately
