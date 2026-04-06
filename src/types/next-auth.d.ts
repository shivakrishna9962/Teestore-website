import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
    interface User {
        mobileNumber?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        mobileNumber?: string | null;
    }
}
