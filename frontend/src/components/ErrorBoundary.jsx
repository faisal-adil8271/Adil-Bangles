import { Component } from "react";

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, errorMessage: "" };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, errorMessage: error?.message || "" };
    }

    componentDidCatch(error, info) {
        console.error("UI ErrorBoundary caught:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-ivory flex items-center justify-center p-6 text-center">
                    <div className="card p-8 max-w-lg space-y-4 shadow-xl border border-parchment bg-white">
                        <div className="w-12 h-12 rounded-full bg-sindoor-50 border border-sindoor-200 text-sindoor-700 flex items-center justify-center mx-auto text-xl font-bold">
                            !
                        </div>
                        <h1 className="text-2xl font-serif font-bold text-ink">Something went wrong</h1>
                        <p className="text-sm text-umber">
                            Bangels Verse caught an unexpected interface glitch. Tap below to refresh or return to the main storefront.
                        </p>
                        {this.state.errorMessage && (
                            <p className="p-3 bg-red-50 text-red-800 font-mono text-xs rounded-lg text-left overflow-x-auto border border-red-200">
                                {this.state.errorMessage}
                            </p>
                        )}
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="btn-primary !py-2 !px-5 text-sm"
                            >
                                Reload Page
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.href = "/";
                                }}
                                className="btn-secondary !py-2 !px-5 text-sm"
                            >
                                Back to Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
