import React, { useCallback, useContext, useEffect, useState } from "react";
import { UserContext } from "../App";
import { usePlaidLink } from "react-plaid-link";

interface PlaidConnectProps {
  onSuccess?: () => void;
}

const PlaidConnect: React.FC<PlaidConnectProps> = ({ onSuccess }) => {
  const { username } = useContext(UserContext);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [missingCredentials, setMissingCredentials] = useState<boolean>(false);

  // Check if already connected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token || !username) return;

        const response = await fetch(
          "http://localhost:5500/api/plaid/transactions",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.ok) {
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Error checking connection:", error);
      }
    };

    checkConnection();
  }, [username]);

  // Function to create Link token with better error handling
  const createLinkToken = useCallback(async () => {
    if (!username) return;
    setIsLoading(true);
    setError(null);
    setMissingCredentials(false);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      console.log("Requesting link token...");
      const response = await fetch(
        "http://localhost:5500/api/create_link_token",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON response received");
        const text = await response.text();
        console.error("Response text:", text);
        throw new Error("Invalid response format from server");
      }

      const data = await response.json();

      // Check for explicit error in response
      if (!response.ok) {
        // Special handling for missing credentials
        if (data.missingCredentials) {
          setMissingCredentials(true);
          throw new Error("Plaid API credentials not configured on the server");
        }
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      if (data.link_token) {
        console.log("Received link token successfully");
        setLinkToken(data.link_token);
      } else {
        console.error("No link token in response:", data);
        throw new Error("No link token received from server");
      }
    } catch (error: any) {
      console.error("Failed to create link token:", error);
      setError(`Error creating link token: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  // Initialize the link creation when the component mounts
  useEffect(() => {
    if (!isConnected && username) {
      createLinkToken();
    }
  }, [createLinkToken, username, isConnected]);

  // Handle successful Plaid Link completion
  const onPlaidSuccess = useCallback(
    async (public_token: string) => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          "http://localhost:5500/api/exchange_public_token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ public_token }),
          }
        );

        const data = await response.json();
        if (response.ok) {
          setIsConnected(true);
          if (onSuccess) onSuccess();
        } else {
          throw new Error(data.error || "Failed to exchange token");
        }
      } catch (error: any) {
        setError(`Error connecting account: ${error.message}`);
        console.error("Error exchanging token:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess]
  );

  // Handle disconnecting a bank account
  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5500/api/plaid/disconnect",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setIsConnected(false);
        createLinkToken(); // Reset to allow reconnection
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to disconnect account");
      }
    } catch (error: any) {
      setError(`Error disconnecting account: ${error.message}`);
      console.error("Error disconnecting account:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Plaid Link with updated config
  const config = {
    token: linkToken,
    onSuccess: (public_token: string) => {
      console.log("Plaid Link success - received public token");
      onPlaidSuccess(public_token);
    },
    onExit: (err: any, metadata: any) => {
      console.log("Plaid Link exit", { err, metadata });
      if (err) {
        setError(
          `Link exited with error: ${
            err.error_message || err.display_message || "Unknown error"
          }`
        );
      }
    },
    onEvent: (eventName: string, metadata: any) => {
      console.log("Plaid Link event", eventName, metadata);
    },
  };

  const { open, ready } = usePlaidLink(config);

  if (!username) {
    return null;
  }

  // Add a special message for missing credentials
  if (missingCredentials) {
    return (
      <div className="plaid-connect">
        <div className="alert alert-info">
          <h4>Plaid API Setup Required</h4>
          <p>
            To use bank account connections, the administrator needs to
            configure Plaid API credentials.
          </p>
          <p>
            Developers: Sign up for a free Plaid account and add your API keys
            to the server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="plaid-connect">
      {error && <div className="alert alert-warning">{error}</div>}

      {isConnected ? (
        <div className="connected-status">
          <div className="status-badge success">
            <span>✓</span> Bank Account Connected
          </div>
          <button
            className="btn-secondary"
            onClick={handleDisconnect}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Disconnect Bank Account"}
          </button>
        </div>
      ) : (
        <button
          className="btn-primary connect-btn"
          onClick={() => open()}
          disabled={!ready || !linkToken || isLoading}
        >
          {isLoading ? "Loading..." : "Connect a Bank Account"}
        </button>
      )}

      <p className="plaid-info">
        <small>
          We use Plaid to securely connect your bank account. Your credentials
          are never stored on our servers.
        </small>
      </p>
    </div>
  );
};

export default PlaidConnect;
