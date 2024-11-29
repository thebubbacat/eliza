import { useParams } from "react-router-dom";

export default function Agent() {
    const { agentId } = useParams();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-red-500">
            <h1 className="text-2xl font-bold mb-4">Agent {agentId}</h1>
            <div className="w-full max-w-2xl bg-white rounded-lg shadow p-6">
                <p>Agent details will go here</p>
            </div>
        </div>
    );
}
