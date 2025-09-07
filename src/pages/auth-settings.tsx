import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';

export function AuthSettings() {
  const [clerkKeys, setClerkKeys] = useState({
    publishableKey: '',
    secretKey: '',
  });

  const [socialProviders, setSocialProviders] = useState({
    google: { enabled: false, clientId: '', clientSecret: '' },
    facebook: { enabled: false, appId: '', appSecret: '' },
    github: { enabled: false, clientId: '', clientSecret: '' },
  } as any);

  const handleSave = async () => {
    try {
      // Let LangChain validate and configure
      const config = await (window as any).electron.invoke('langchain:setup-auth', {
        clerk: clerkKeys,
        providers: socialProviders,
      });

      // Initialize Clerk backend in main process (for server side validation)
      await (window as any).electron.invoke('auth:setup', {
        secretKey: clerkKeys.secretKey,
      });

      // Save to settings
      await (window as any).electron.invoke('set-user-settings', {
        auth: { config, clerk: { publishableKey: clerkKeys.publishableKey } },
      });
    } catch (e) {
      console.error('Failed to save auth settings', e);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <CardHeader>
          <CardTitle>Clerk Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="publishableKey">Publishable Key</Label>
            <Input
              id="publishableKey"
              value={clerkKeys.publishableKey}
              onChange={(e) => setClerkKeys({ ...clerkKeys, publishableKey: e.target.value })}
              placeholder="pk_test_..."
            />
            <a
              href="https://dashboard.clerk.com/apps/new"
              target="_blank"
              className="text-sm text-blue-500"
            >
              Get Clerk Keys →
            </a>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretKey">Secret Key</Label>
            <Input
              id="secretKey"
              type="password"
              value={clerkKeys.secretKey}
              onChange={(e) => setClerkKeys({ ...clerkKeys, secretKey: e.target.value })}
              placeholder="sk_test_..."
            />
            <a
              href="https://dashboard.clerk.com/apps/new"
              target="_blank"
              className="text-sm text-blue-500"
            >
              Get Clerk Keys →
            </a>
          </div>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Social Login Providers</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.entries(socialProviders).map(([provider, config]: any) => (
            <div key={provider} className="mb-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold capitalize">{provider}</h3>
                <Toggle
                  pressed={!!config.enabled}
                  onPressedChange={(enabled) =>
                    setSocialProviders({
                      ...socialProviders,
                      [provider]: { ...config, enabled },
                    })
                  }
                >
                  {config.enabled ? 'Enabled' : 'Disabled'}
                </Toggle>
              </div>
              {config.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input
                      placeholder="Client ID"
                      value={config.clientId || config.appId || ''}
                      onChange={(e) =>
                        setSocialProviders({
                          ...socialProviders,
                          [provider]: { ...config, clientId: e.target.value, appId: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Secret</Label>
                    <Input
                      placeholder="Client Secret"
                      type="password"
                      value={config.clientSecret || config.appSecret || ''}
                      onChange={(e) =>
                        setSocialProviders({
                          ...socialProviders,
                          [provider]: { ...config, clientSecret: e.target.value, appSecret: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        Save Authentication Settings
      </Button>
    </div>
  );
}

