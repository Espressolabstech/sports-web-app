declare global {
    interface UserLogin {
        phone: string;
        countryCode?: string;
    }

    interface VerifyOtp {
        phone: string;
        otp: string;
    }

    interface ResendOtp {
        phone: string;
    }

    interface UpdateUserName {
        firstName: string;
        lastName: string;
    }

    interface AuthUser {
        token: string;
        id: string;
        name: string;
        phone: string;
        role: string;
        isNewUser: boolean;
    }

    interface AuthResponse {
        message: string;
        data: AuthUser;
    }
}

export {};
