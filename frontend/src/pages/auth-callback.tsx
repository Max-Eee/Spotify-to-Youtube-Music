import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const service = searchParams.get("service");
    const isError = window.location.pathname.includes("error");

    useEffect(() => {
        // Give user a moment to see the message
        const timer = setTimeout(() => {
            navigate("/");
        }, 2000);

        return () => clearTimeout(timer);
    }, [navigate]);

    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">
                        Authentication Failed
                    </h1>
                    <p className="text-gray-600">
                        Failed to connect to {service}. Please try again.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        Redirecting back...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-green-500 mb-4">
                    Successfully Connected!
                </h1>
                <p className="text-gray-600">
                    You've successfully connected to {service}.
                </p>
                <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
            </div>
        </div>
    );
}
