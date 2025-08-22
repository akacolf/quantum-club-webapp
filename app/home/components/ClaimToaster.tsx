interface ClaimToasterProps {
    message: string;
    show: boolean;
}

export default function ClaimToaster({ message, show }: ClaimToasterProps) {

    if (!show) return null;
    return (
        <div className="toast toast-top toast-center">
            <div className="alert alert-info">
                <span>{message}</span>
            </div>
        </div>
    )
}