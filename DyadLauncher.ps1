# PowerShell script to create a silent launcher executable
# This creates a Windows executable that launches Dyad with no console

$source = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

public class DyadLauncher
{
    static void Main()
    {
        try
        {
            // Kill any existing processes
            foreach (var process in Process.GetProcessesByName("electron"))
            {
                try { process.Kill(); } catch { }
            }
            foreach (var process in Process.GetProcessesByName("node"))
            {
                try { process.Kill(); } catch { }
            }
            
            System.Threading.Thread.Sleep(1000);
            
            // Get the directory where this exe is located
            string exePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
            string appDir = Path.GetDirectoryName(exePath);
            
            // Start npm in hidden mode
            ProcessStartInfo startInfo = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/c npm start",
                WorkingDirectory = appDir,
                WindowStyle = ProcessWindowStyle.Hidden,
                CreateNoWindow = true,
                UseShellExecute = false
            };
            
            Process.Start(startInfo);
        }
        catch (Exception ex)
        {
            MessageBox.Show("Failed to start Dyad: " + ex.Message, "Dyad Launcher", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
'@

# Compile to EXE
Add-Type -TypeDefinition $source -Language CSharp -OutputAssembly "Dyad.exe" -OutputType WindowsApplication -ReferencedAssemblies System.Windows.Forms

Write-Host "✅ Created Dyad.exe - A true Windows executable!" -ForegroundColor Green
