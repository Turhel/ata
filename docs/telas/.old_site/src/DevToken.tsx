import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";

export default function DevToken() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [token, setToken] = useState<string>("");

  async function handleGetToken() {
    const t = await getToken();
    setToken(t ?? "");
  }

  if (!isLoaded) return <div>Loading auth...</div>;
  if (!isSignedIn) return <div>Sign in first.</div>;

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <button onClick={handleGetToken}>Get token</button>
      <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {token || "No token yet"}
      </pre>
    </div>
  );
}
