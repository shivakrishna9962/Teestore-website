# Requirements Document

## Introduction

This feature adds mobile number login support to the TeeShop e-commerce platform. Currently users can only authenticate via email/password or Google OAuth. This feature allows users to register and log in using a mobile phone number with OTP (one-time password) verification via SMS, as an alternative to email-based login. Users will be able to use either their email or mobile number to sign in.

## Glossary

- **Auth_System**: The NextAuth-based authentication system managing user sessions and credentials
- **OTP_Service**: The SMS delivery service responsible for generating and sending one-time passwords to mobile numbers
- **OTP**: A one-time password — a time-limited numeric code sent via SMS used to verify mobile number ownership
- **Mobile_Validator**: The component responsible for validating mobile number format and country code
- **User**: A registered customer of the TeeShop platform
- **Login_Page**: The UI page at `/login` where users authenticate
- **Signup_Page**: The UI page at `/signup` where new users register
- **User_Store**: The MongoDB User collection managed via Mongoose

## Requirements

### Requirement 1: Mobile Number Registration

**User Story:** As a new user, I want to register with my mobile number, so that I can create an account without needing an email address.

#### Acceptance Criteria

1. THE Signup_Page SHALL provide an option to register using a mobile number in addition to email.
2. WHEN a user selects mobile number registration, THE Signup_Page SHALL display a country code selector and a mobile number input field.
3. WHEN a user submits a mobile number for registration, THE Mobile_Validator SHALL validate that the number contains only digits and matches the selected country code's expected length (7–15 digits per E.164 standard).
4. IF a user submits an invalid mobile number format, THEN THE Signup_Page SHALL display a descriptive inline error message without submitting the form.
5. WHEN a valid mobile number is submitted for registration, THE OTP_Service SHALL send a 6-digit OTP to that number via SMS.
6. WHEN an OTP is sent, THE Signup_Page SHALL display an OTP entry screen where the user can enter the received code.
7. WHEN a user submits a correct OTP within 10 minutes of generation, THE Auth_System SHALL create a new user account with the verified mobile number stored in the User_Store.
8. IF a user submits an incorrect OTP, THEN THE Auth_System SHALL return an error message and allow the user to retry, up to 5 attempts.
9. IF a user exhausts all 5 OTP attempts, THEN THE Auth_System SHALL invalidate the OTP and require the user to request a new one.
10. IF a user attempts to register with a mobile number already associated with an existing account, THEN THE Auth_System SHALL return an error indicating the number is already in use.
11. WHEN a new account is created via mobile number, THE User_Store SHALL store the mobile number in E.164 format as a unique, indexed field on the user document.

### Requirement 2: Mobile Number Login

**User Story:** As a registered user, I want to log in using my mobile number and an OTP, so that I can access my account without remembering a password.

#### Acceptance Criteria

1. THE Login_Page SHALL provide a toggle allowing users to choose between email/password login and mobile number login.
2. WHEN a user selects mobile number login, THE Login_Page SHALL display a country code selector and a mobile number input field.
3. WHEN a user submits a mobile number for login, THE Mobile_Validator SHALL validate the number format before sending an OTP request.
4. IF a user submits a mobile number not associated with any account, THEN THE Auth_System SHALL return an error indicating no account was found for that number.
5. WHEN a valid, registered mobile number is submitted, THE OTP_Service SHALL send a 6-digit OTP to that number via SMS.
6. WHEN a user submits a correct OTP within 10 minutes of generation, THE Auth_System SHALL authenticate the user and establish a session.
7. IF a user submits an incorrect OTP during login, THEN THE Auth_System SHALL return an error and allow retry up to 5 attempts.
8. IF a user exhausts all 5 OTP attempts during login, THEN THE Auth_System SHALL invalidate the OTP and require the user to request a new one.
9. WHEN a user is successfully authenticated via mobile OTP, THE Auth_System SHALL issue a JWT session token equivalent to email/password login.

### Requirement 3: OTP Lifecycle Management

**User Story:** As a user, I want OTPs to expire and be resendable, so that my account remains secure if an SMS is delayed or intercepted.

#### Acceptance Criteria

1. THE Auth_System SHALL generate a cryptographically random 6-digit OTP for each verification request.
2. WHEN an OTP is generated, THE Auth_System SHALL store a hashed version of the OTP alongside its expiry timestamp (10 minutes from generation) in the User_Store.
3. WHEN an OTP expires, THE Auth_System SHALL reject any submission of that OTP and return an expiry error.
4. WHEN a new OTP is requested for a number that already has a pending OTP, THE Auth_System SHALL invalidate the previous OTP and generate a new one.
5. THE Auth_System SHALL enforce a minimum interval of 60 seconds between OTP send requests for the same mobile number to prevent SMS flooding.
6. IF a resend is requested before the 60-second interval has elapsed, THEN THE Auth_System SHALL return an error indicating the remaining wait time.
7. WHEN an OTP is successfully verified, THE Auth_System SHALL immediately invalidate the OTP to prevent reuse.

### Requirement 4: User Model Extension

**User Story:** As a developer, I want the user data model to support mobile numbers, so that mobile-based authentication can be persisted reliably.

#### Acceptance Criteria

1. THE User_Store SHALL store a `mobileNumber` field in E.164 format (e.g., `+14155552671`) on user documents.
2. THE User_Store SHALL enforce uniqueness on the `mobileNumber` field across all user documents.
3. THE User_Store SHALL allow the `mobileNumber` field to be absent for users who registered via email or OAuth.
4. THE User_Store SHALL store OTP verification state fields: `otpHash`, `otpExpiry`, and `otpAttempts` on user documents.
5. WHEN OTP verification is complete, THE Auth_System SHALL clear `otpHash`, `otpExpiry`, and `otpAttempts` from the user document.

### Requirement 5: Account Linking

**User Story:** As a user who already has an email account, I want to add my mobile number to my existing account, so that I can use either method to log in.

#### Acceptance Criteria

1. THE Auth_System SHALL allow an authenticated user to associate a mobile number with their existing account.
2. WHEN an authenticated user adds a mobile number, THE OTP_Service SHALL send a verification OTP to confirm ownership before saving the number.
3. WHEN a verified mobile number is added to an existing account, THE User_Store SHALL update the user document with the `mobileNumber` field.
4. IF a user attempts to add a mobile number already linked to a different account, THEN THE Auth_System SHALL return an error indicating the number is already in use.

### Requirement 6: SMS Delivery Reliability

**User Story:** As a user, I want to receive OTP SMS messages reliably, so that I am not blocked from logging in due to delivery failures.

#### Acceptance Criteria

1. WHEN an OTP send request fails due to an SMS provider error, THE OTP_Service SHALL return a descriptive error to the caller without creating an OTP record.
2. THE OTP_Service SHALL integrate with a configurable SMS provider (e.g., Twilio) via environment variables, so that the provider can be changed without code modifications.
3. WHERE the SMS provider supports delivery status callbacks, THE OTP_Service SHALL log delivery status for monitoring purposes.
