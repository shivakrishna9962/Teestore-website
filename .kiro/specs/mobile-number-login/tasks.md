# Implementation Plan: Mobile Number Login

## Overview

Extend TeeShop's authentication system to support mobile number + OTP login. The implementation adds new fields to the User model, a dedicated OTP service, an SMS provider abstraction, new API routes, UI components, and wires everything into the existing NextAuth setup.

## Tasks

- [x] 1. Extend User model with mobile and OTP fields
  - Add `mobileNumber`, `otpHash`, `otpExpiry`, `otpAttempts`, `otpLastSentAt` fields to `UserSchema` in `src/models/User.ts`
  - Apply `sparse: true` on the `mobileNumber` unique index so email/OAuth users are unaffected
  - Extend `src/types/next-auth.d.ts` (create if absent) to add `mobileNumber?: string` to the NextAuth `User` interface
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 1.1 Write property test for User model mobile fields
    - **Property 5: Duplicate mobile number is always rejected**
    - **Validates: Requirements 1.10, 4.2, 5.4**
    - **Property 6: Mobile numbers are stored in E.164 format**
    - **Validates: Requirements 1.11, 4.1**

- [x] 2. Implement SMS provider abstraction and Twilio adapter
  - Create `src/lib/sms.ts` with `SmsProvider` interface and `createSmsProvider()` factory
  - Twilio adapter reads `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` from env
  - Log delivery status when available per Requirement 6.3
  - _Requirements: 6.2, 6.3_

  - [ ]* 2.1 Write property test for SMS provider failure handling
    - **Property 14: SMS provider failure does not create an OTP record**
    - **Validates: Requirements 6.1**

- [x] 3. Implement OtpService
  - Create `src/lib/otp.ts` with `sendOtp(mobileNumber, purpose)` and `verifyOtp(mobileNumber, code)` functions
  - `sendOtp`: validate E.164 format, enforce 60-second cooldown via `otpLastSentAt`, generate 6-digit crypto-random code, bcrypt-hash it, persist `otpHash`/`otpExpiry`/`otpAttempts`/`otpLastSentAt`, call SMS provider
  - `verifyOtp`: find user, compare hash, check expiry, increment `otpAttempts`, clear OTP fields on success or after 5 failures
  - _Requirements: 1.3, 1.5, 1.7, 1.8, 1.9, 2.3, 2.5, 2.6, 2.7, 2.8, 3.1–3.7_

  - [ ]* 3.1 Write property test for OTP generation
    - **Property 2: OTP is always exactly 6 digits**
    - **Validates: Requirements 1.5, 2.5, 3.1**

  - [ ]* 3.2 Write property test for OTP hash storage
    - **Property 8: OTP state is stored as a hash with a future expiry**
    - **Validates: Requirements 3.2, 4.4**

  - [ ]* 3.3 Write property test for OTP expiry rejection
    - **Property 9: Expired OTP is rejected**
    - **Validates: Requirements 3.3**

  - [ ]* 3.4 Write property test for OTP retry and invalidation
    - **Property 4: Incorrect OTP allows retry up to 5 attempts, then invalidates**
    - **Validates: Requirements 1.8, 1.9, 2.7, 2.8**

  - [ ]* 3.5 Write property test for OTP rate limiting
    - **Property 11: OTP send rate limiting is enforced**
    - **Validates: Requirements 3.5, 3.6**

  - [ ]* 3.6 Write property test for OTP invalidation on new request
    - **Property 10: Requesting a new OTP invalidates the previous one**
    - **Validates: Requirements 3.4**

  - [ ]* 3.7 Write property test for OTP field cleanup after verification
    - **Property 12: OTP fields are cleared after successful verification**
    - **Validates: Requirements 3.7, 4.5**

- [x] 4. Add `mobile-otp` NextAuth credentials provider
  - In `src/lib/auth.ts`, add a second `CredentialsProvider` named `mobile-otp` with `mobileNumber` and `otp` credential fields
  - `authorize` calls `verifyOtp(mobileNumber, otp)` and returns the user object (same shape as the existing credentials provider) on success, or `null` on failure
  - Update the `jwt` callback to handle users without an email (mobile-only) by looking up by `token.sub` when `token.email` is absent
  - _Requirements: 2.6, 2.9_

  - [ ]* 4.1 Write property test for mobile OTP session equivalence
    - **Property 7: Mobile OTP session is equivalent to email/password session**
    - **Validates: Requirements 2.9**

- [x] 5. Implement `/api/auth/otp/send` route
  - Create `src/app/api/auth/otp/route.ts` handling `POST` requests
  - Parse and validate `{ mobileNumber, purpose }` from request body
  - Delegate to `sendOtp(mobileNumber, purpose)` and map `SendOtpResult` to the HTTP responses defined in the design (200, 400, 404, 409, 429, 502)
  - _Requirements: 1.5, 2.5, 3.5, 3.6, 6.1_

  - [ ]* 5.1 Write unit tests for `/api/auth/otp/send`
    - Test 409 for duplicate number on `register` purpose
    - Test 404 for unregistered number on `login` purpose
    - Test 429 within 60-second cooldown
    - _Requirements: 1.10, 2.4, 3.5_

- [x] 6. Implement `/api/user/mobile` account-linking route
  - Create `src/app/api/user/mobile/route.ts` handling `POST` requests (authenticated)
  - Accept `{ mobileNumber, otp }` — if `otp` is absent, call `sendOtp(mobileNumber, 'link')`; if present, call `verifyOtp` then update the user document
  - Return 409 if the number is already linked to another account
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 6.1 Write property test for account linking OTP gate
    - **Property 13: Account linking requires OTP verification before saving**
    - **Validates: Requirements 5.2**

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Build `PhoneInput` component
  - Create `src/components/PhoneInput.tsx` with a country code dropdown and a number input field
  - Validate on change: strip non-digits, enforce 7–15 digit length, emit E.164 string via `onChange`
  - Display inline error via `error` prop
  - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3_

  - [ ]* 8.1 Write property test for mobile number validation consistency
    - **Property 1: Mobile number validation is consistent**
    - **Validates: Requirements 1.3, 2.3**

- [x] 9. Build `OtpInput` component
  - Create `src/components/OtpInput.tsx` with 6 single-character input boxes
  - Auto-advance focus on digit entry; call `onComplete(code)` when all 6 digits are filled
  - Support `disabled` prop (used during submission) and display `error` prop below the inputs
  - _Requirements: 1.6, 2.5_

- [x] 10. Update Signup page with mobile registration flow
  - In `src/app/(store)/signup/page.tsx`, add a toggle between email and mobile registration modes
  - Mobile mode renders `PhoneInput`; on submit calls `POST /api/auth/otp/send` with `purpose: 'register'`
  - On success, render `OtpInput`; on OTP submit call `signIn('mobile-otp', { mobileNumber, otp })`
  - Display inline errors for all failure cases (invalid format, duplicate number, incorrect OTP, max attempts, expiry)
  - _Requirements: 1.1, 1.2, 1.4, 1.6, 1.7, 1.8, 1.9, 1.10_

  - [ ]* 10.1 Write unit tests for Signup page mobile flow
    - Test toggle renders `PhoneInput`
    - Test OTP screen appears after successful send
    - Test inline error on duplicate number (409)
    - _Requirements: 1.1, 1.4, 1.10_

- [x] 11. Update Login page with mobile login flow
  - In `src/app/(store)/login/page.tsx`, add a toggle between email/password and mobile OTP modes
  - Mobile mode renders `PhoneInput`; on submit calls `POST /api/auth/otp/send` with `purpose: 'login'`
  - On success, render `OtpInput`; on OTP submit call `signIn('mobile-otp', { mobileNumber, otp })`
  - Display inline errors for all failure cases (number not found, incorrect OTP, max attempts, expiry)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 2.8_

  - [ ]* 11.1 Write unit tests for Login page mobile flow
    - Test toggle renders `PhoneInput`
    - Test OTP screen appears after successful send
    - Test inline error on unregistered number (404)
    - _Requirements: 2.1, 2.4_

- [x] 12. Wire account-linking into user profile / settings
  - Add a "Link mobile number" section that calls `POST /api/user/mobile` (send step, then verify step)
  - Reuse `PhoneInput` and `OtpInput` components
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

  - [ ]* 13.1 Write property test for correct OTP creating account or session
    - **Property 3: Correct OTP within expiry creates account or session**
    - **Validates: Requirements 1.7, 2.6**

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with a minimum of 100 iterations each
- Each property test must include the comment: `// Feature: mobile-number-login, Property N: <property text>`
- The `mobile-otp` NextAuth provider is additive — no changes to the existing `credentials` or `google` providers
