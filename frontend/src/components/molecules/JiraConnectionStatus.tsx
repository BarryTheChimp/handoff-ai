import { useState, useEffect } from 'react';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import {
  Link,
  Unlink,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { jiraApi, JiraConnectionStatus as ConnectionStatus } from '../../services/api';

interface JiraConnectionStatusProps {
  onStatusChange?: (connected: boolean) => void;
}

export function JiraConnectionStatus({ onStatusChange }: JiraConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (status) {
      onStatusChange?.(status.connected);
    }
  }, [status, onStatusChange]);

  const checkStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await jiraApi.getStatus();
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check Jira connection');
      setStatus({ connected: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { authUrl, state } = await jiraApi.getAuthUrl();
      // Store state for CSRF verification
      sessionStorage.setItem('jira_oauth_state', state);
      // Redirect to Jira OAuth
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Jira connection');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError(null);
    try {
      await jiraApi.disconnect();
      setStatus({ connected: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect from Jira');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-toucan-grey-400">
        <Spinner size="sm" />
        <span className="text-sm">Checking Jira connection...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-3 bg-toucan-error/10 border border-toucan-error/30 rounded-md">
        <AlertCircle size={18} className="text-toucan-error" />
        <span className="text-sm text-toucan-error flex-1">{error}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={checkStatus}
          leftIcon={<RefreshCw size={14} />}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="flex items-center justify-between p-3 bg-toucan-success/10 border border-toucan-success/30 rounded-md">
        <div className="flex items-center gap-3">
          <CheckCircle size={18} className="text-toucan-success" />
          <div>
            <p className="text-sm text-toucan-grey-100 font-medium">
              Connected to Jira
            </p>
            {status.user && (
              <p className="text-xs text-toucan-grey-400">
                as {status.user.displayName}
                {status.user.emailAddress && ` (${status.user.emailAddress})`}
              </p>
            )}
            {status.siteUrl && (
              <a
                href={status.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-toucan-info hover:underline flex items-center gap-1 mt-1"
              >
                {status.siteUrl.replace('https://', '')}
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          loading={isDisconnecting}
          leftIcon={<Unlink size={14} />}
          className="text-toucan-grey-400 hover:text-toucan-error"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 bg-toucan-dark-lighter border border-toucan-dark-border rounded-md">
      <div className="flex items-center gap-3">
        <Link size={18} className="text-toucan-grey-400" />
        <div>
          <p className="text-sm text-toucan-grey-200">Not connected to Jira</p>
          <p className="text-xs text-toucan-grey-400">
            Connect to export work items directly to your Jira project
          </p>
        </div>
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={handleConnect}
        loading={isConnecting}
        leftIcon={<Link size={14} />}
      >
        Connect Jira
      </Button>
    </div>
  );
}
