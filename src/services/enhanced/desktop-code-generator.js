/**
 * Desktop Code Generator Service
 * Generates complete desktop application code for various frameworks
 */

class DesktopCodeGenerator {
  constructor(claudeService, templateMatcher) {
    this.claude = claudeService;
    this.templateMatcher = templateMatcher;
  }

  /**
   * Generate complete desktop application
   */
  async generateDesktopApp(request, framework, context) {
    console.log(`Generating ${framework} desktop app for: ${request}`);

    try {
      // Get appropriate template
      const template = await this.findBestTemplate(request, framework);

      // Generate framework-specific architecture
      const architecture = await this.generateArchitecture(
        request,
        framework,
        template,
        context,
      );

      // Generate main process/backend code
      const mainCode = await this.generateMainCode(request, framework, context);

      // Generate renderer/frontend code
      const frontendCode = await this.generateFrontendCode(
        request,
        framework,
        context,
      );

      // Generate configuration files
      const configFiles = await this.generateConfigurationFiles(
        request,
        framework,
        context,
      );

      // Generate build/packaging scripts
      const buildScripts = await this.generateBuildScripts(request, framework);

      // Generate setup instructions
      const setupInstructions = this.generateSetupInstructions(framework);

      return {
        framework,
        template: template?.name || "custom",
        architecture,
        files: {
          main: mainCode,
          frontend: frontendCode,
          config: configFiles,
          build: buildScripts,
        },
        setupInstructions,
        success: true,
      };
    } catch (error) {
      console.error(`Error generating ${framework} app:`, error);
      return {
        framework,
        success: false,
        error: error.message,
        fallbackInstructions: this.getFallbackInstructions(framework),
      };
    }
  }

  /**
   * Find best template for the framework
   */
  async findBestTemplate(request, framework) {
    if (!this.templateMatcher) {
      return null;
    }

    const searchQuery = `${request} ${framework} desktop app`;
    try {
      return await this.templateMatcher.findBestTemplate(searchQuery, "medium");
    } catch (error) {
      console.warn(`Could not find template for ${framework}:`, error.message);
      return null;
    }
  }

  /**
   * Generate application architecture
   */
  async generateArchitecture(request, framework, template, context) {
    const architecturePrompt = this.getArchitecturePrompt(
      request,
      framework,
      template,
      context,
    );

    if (!this.claude) {
      return this.getDefaultArchitecture(framework);
    }

    try {
      const response = await this.claude.generateWithFullContext(
        architecturePrompt,
        context,
      );
      return this.parseArchitectureResponse(response);
    } catch (error) {
      console.error("Error generating architecture:", error);
      return this.getDefaultArchitecture(framework);
    }
  }

  /**
   * Generate main/backend code
   */
  async generateMainCode(request, framework, context) {
    const generators = {
      electron: () => this.generateElectronMain(request, context),
      tauri: () => this.generateTauriBackend(request, context),
      flutter: () => this.generateFlutterMain(request, context),
      dotnet: () => this.generateDotNetMain(request, context),
      python: () => this.generatePythonMain(request, context),
    };

    const generator = generators[framework];
    if (!generator) {
      throw new Error(`Unknown framework: ${framework}`);
    }

    return await generator();
  }

  /**
   * Generate frontend code
   */
  async generateFrontendCode(request, framework, context) {
    const generators = {
      electron: () => this.generateElectronRenderer(request, context),
      tauri: () => this.generateTauriFrontend(request, context),
      flutter: () => this.generateFlutterWidgets(request, context),
      dotnet: () => this.generateDotNetUI(request, context),
      python: () => this.generatePythonUI(request, context),
    };

    const generator = generators[framework];
    if (!generator) {
      throw new Error(`Unknown framework: ${framework}`);
    }

    return await generator();
  }

  /**
   * Generate configuration files
   */
  async generateConfigurationFiles(request, framework, context) {
    const configs = {
      electron: () => this.generateElectronConfig(request, context),
      tauri: () => this.generateTauriConfig(request, context),
      flutter: () => this.generateFlutterConfig(request, context),
      dotnet: () => this.generateDotNetConfig(request, context),
      python: () => this.generatePythonConfig(request, context),
    };

    const generator = configs[framework];
    if (!generator) {
      return {};
    }

    return await generator();
  }

  /**
   * Generate Electron main process
   */
  async generateElectronMain(request, context) {
    const prompt = `Generate a complete Electron main process (main.js) for: ${request}

Requirements:
- Modern Electron best practices
- Security-first approach (context isolation, sandbox)
- Window management
- IPC handlers
- Menu bar setup
- Auto-updater ready
- Error handling

Generate production-ready code with comments.`;

    if (this.claude) {
      try {
        return await this.claude.generateWithFullContext(prompt, context);
      } catch (error) {
        console.error("Error generating Electron main:", error);
      }
    }

    // Fallback template
    return `const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('app:version', () => {
  return app.getVersion();
});

ipcMain.handle('app:name', () => {
  return app.getName();
});

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault();
  });
});`;
  }

  /**
   * Generate Electron renderer
   */
  async generateElectronRenderer(request, context) {
    const prompt = `Generate Electron renderer code (renderer.js and index.html) for: ${request}

Requirements:
- Modern HTML/CSS/JavaScript
- IPC communication via window.api
- Responsive design
- User-friendly interface
- Error handling

Generate complete, working code.`;

    if (this.claude) {
      try {
        const response = await this.claude.generateWithFullContext(
          prompt,
          context,
        );
        return {
          "index.html": this.extractHTMLFromResponse(response),
          "renderer.js": this.extractJSFromResponse(response),
          "style.css": this.extractCSSFromResponse(response),
          "preload.js": this.generateElectronPreload(),
        };
      } catch (error) {
        console.error("Error generating Electron renderer:", error);
      }
    }

    // Fallback templates
    return {
      "index.html": `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${request}</title>
    <link rel="stylesheet" href="style.css">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'">
</head>
<body>
    <div id="app">
        <header>
            <h1>${request}</h1>
        </header>
        <main>
            <div id="content">
                <!-- App content here -->
            </div>
        </main>
        <footer>
            <p>Version: <span id="version"></span></p>
        </footer>
    </div>
    <script src="renderer.js"></script>
</body>
</html>`,
      "renderer.js": `// Renderer process script
document.addEventListener('DOMContentLoaded', async () => {
    // Get app version
    const version = await window.api.getVersion();
    document.getElementById('version').textContent = version;
    
    // Initialize app
    initializeApp();
});

function initializeApp() {
    console.log('App initialized');
    // Add your app logic here
}`,
      "style.css": `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    height: 100vh;
}

#app {
    display: flex;
    flex-direction: column;
    height: 100%;
}

header {
    padding: 20px;
    background: rgba(0, 0, 0, 0.2);
}

main {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
}

footer {
    padding: 10px 20px;
    background: rgba(0, 0, 0, 0.2);
    text-align: center;
}`,
      "preload.js": this.generateElectronPreload(),
    };
  }

  /**
   * Generate Electron preload script
   */
  generateElectronPreload() {
    return `const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
    getVersion: () => ipcRenderer.invoke('app:version'),
    getName: () => ipcRenderer.invoke('app:name'),
    
    // Add more API methods as needed
    send: (channel, data) => {
        // Whitelist channels
        const validChannels = ['toMain'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        const validChannels = ['fromMain'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
});`;
  }

  /**
   * Generate Electron configuration
   */
  async generateElectronConfig(request, context) {
    const appName = this.sanitizeAppName(request);

    return {
      "package.json": {
        name: appName.toLowerCase().replace(/\s+/g, "-"),
        version: "1.0.0",
        description: request,
        main: "main.js",
        scripts: {
          start: "electron .",
          dev: "electron . --dev",
          build: "electron-builder",
          dist: "electron-builder --publish=never",
        },
        devDependencies: {
          electron: "^31.0.0",
          "electron-builder": "^24.13.0",
        },
        build: {
          appId: `com.example.${appName.toLowerCase()}`,
          productName: appName,
          directories: {
            output: "dist",
          },
          files: [
            "**/*",
            "!**/*.ts",
            "!*.code-workspace",
            "!.gitignore",
            "!README.md",
          ],
          win: {
            target: "nsis",
            icon: "assets/icon.ico",
          },
          mac: {
            target: "dmg",
            icon: "assets/icon.icns",
          },
          linux: {
            target: "AppImage",
            icon: "assets/icon.png",
          },
        },
      },
    };
  }

  /**
   * Generate Tauri backend
   */
  async generateTauriBackend(request, context) {
    const prompt = `Generate Tauri Rust backend (src-tauri/src/main.rs) for: ${request}

Requirements:
- Tauri commands with #[tauri::command]
- State management
- Error handling
- Security best practices
- File operations if needed

Generate complete Rust code.`;

    if (this.claude) {
      try {
        return await this.claude.generateWithFullContext(prompt, context);
      } catch (error) {
        console.error("Error generating Tauri backend:", error);
      }
    }

    // Fallback template
    return `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, State};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct AppState {
    message: String,
}

// Tauri commands
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to the app.", name)
}

#[tauri::command]
fn get_state(state: State<Mutex<AppState>>) -> Result<String, String> {
    let app_state = state.lock().map_err(|_| "Failed to lock state")?;
    Ok(app_state.message.clone())
}

#[tauri::command]
fn update_state(message: String, state: State<Mutex<AppState>>) -> Result<(), String> {
    let mut app_state = state.lock().map_err(|_| "Failed to lock state")?;
    app_state.message = message;
    Ok(())
}

fn main() {
    let app_state = Mutex::new(AppState {
        message: "Initial state".to_string(),
    });

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![greet, get_state, update_state])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}`;
  }

  /**
   * Generate Tauri frontend
   */
  async generateTauriFrontend(request, context) {
    const prompt = `Generate Tauri frontend code for: ${request}

Requirements:
- Modern web technologies (HTML/CSS/JS or React/Vue)
- Tauri API integration (@tauri-apps/api)
- Responsive design
- Command invocation
- Event handling

Generate complete frontend code.`;

    if (this.claude) {
      try {
        const response = await this.claude.generateWithFullContext(
          prompt,
          context,
        );
        return this.parseFrontendResponse(response);
      } catch (error) {
        console.error("Error generating Tauri frontend:", error);
      }
    }

    // Fallback template
    return {
      "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${request}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <h1>${request}</h1>
        <div id="content">
            <input type="text" id="nameInput" placeholder="Enter your name">
            <button id="greetBtn">Greet</button>
            <div id="result"></div>
        </div>
    </div>
    <script src="main.js" type="module"></script>
</body>
</html>`,
      "main.js": `import { invoke } from '@tauri-apps/api/tauri';

document.getElementById('greetBtn').addEventListener('click', async () => {
    const name = document.getElementById('nameInput').value;
    if (name) {
        try {
            const result = await invoke('greet', { name });
            document.getElementById('result').textContent = result;
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('result').textContent = 'Error: ' + error;
        }
    }
});`,
      "style.css": `body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

#app {
    background: white;
    border-radius: 10px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 100%;
}

h1 {
    color: #333;
    margin-bottom: 20px;
}

#content {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

input {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 16px;
}

button {
    padding: 10px 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
}

button:hover {
    background: #5a67d8;
}

#result {
    padding: 15px;
    background: #f0f0f0;
    border-radius: 5px;
    min-height: 50px;
}`,
    };
  }

  /**
   * Generate Tauri configuration
   */
  async generateTauriConfig(request, context) {
    const appName = this.sanitizeAppName(request);

    return {
      "tauri.conf.json": {
        build: {
          beforeDevCommand: "npm run dev",
          beforeBuildCommand: "npm run build",
          devPath: "http://localhost:3000",
          distDir: "../dist",
          withGlobalTauri: false,
        },
        package: {
          productName: appName,
          version: "1.0.0",
        },
        tauri: {
          allowlist: {
            all: false,
            shell: {
              all: false,
              open: true,
            },
            fs: {
              all: false,
              readFile: true,
              writeFile: true,
              readDir: true,
              scope: ["$APPDATA", "$APPDATA/*"],
            },
          },
          bundle: {
            active: true,
            targets: "all",
            identifier: `com.example.${appName.toLowerCase()}`,
            icon: [
              "icons/32x32.png",
              "icons/128x128.png",
              "icons/128x128@2x.png",
              "icons/icon.icns",
              "icons/icon.ico",
            ],
          },
          security: {
            csp: null,
          },
          windows: [
            {
              fullscreen: false,
              resizable: true,
              title: appName,
              width: 1200,
              height: 800,
            },
          ],
        },
      },
      "Cargo.toml": `[package]
name = "${appName.toLowerCase().replace(/\s+/g, "-")}"
version = "1.0.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tauri = { version = "1.6", features = ["shell-open", "fs-all"] }

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]`,
    };
  }

  /**
   * Generate Flutter main
   */
  async generateFlutterMain(request, context) {
    const prompt = `Generate Flutter desktop main.dart for: ${request}

Requirements:
- Material Design
- Desktop-specific adaptations
- State management
- Responsive layout
- Platform-specific features

Generate complete Flutter code.`;

    if (this.claude) {
      try {
        return await this.claude.generateWithFullContext(prompt, context);
      } catch (error) {
        console.error("Error generating Flutter main:", error);
      }
    }

    // Fallback template
    return `import 'package:flutter/material.dart';
import 'dart:io' show Platform;

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${request}',
      theme: ThemeData(
        primarySwatch: Colors.deepPurple,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  @override
  _HomePageState createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String message = 'Welcome to ${request}';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${request}'),
      ),
      body: Center(
        child: Container(
          constraints: BoxConstraints(maxWidth: 800),
          padding: EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Text(
                message,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              SizedBox(height: 30),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    message = 'Button clicked!';
                  });
                },
                child: Text('Click Me'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}`;
  }

  /**
   * Generate Flutter widgets
   */
  async generateFlutterWidgets(request, context) {
    return {
      "lib/widgets/custom_button.dart": `import 'package:flutter/material.dart';

class CustomButton extends StatelessWidget {
  final String text;
  final VoidCallback onPressed;
  final Color? color;

  const CustomButton({
    Key? key,
    required this.text,
    required this.onPressed,
    this.color,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: color ?? Theme.of(context).primaryColor,
        padding: EdgeInsets.symmetric(horizontal: 30, vertical: 15),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      onPressed: onPressed,
      child: Text(
        text,
        style: TextStyle(fontSize: 16),
      ),
    );
  }
}`,
      "lib/screens/home_screen.dart": `import 'package:flutter/material.dart';
import '../widgets/custom_button.dart';

class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF667eea),
              Color(0xFF764ba2),
            ],
          ),
        ),
        child: Center(
          child: Card(
            margin: EdgeInsets.all(20),
            child: Padding(
              padding: EdgeInsets.all(30),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${request}',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 20),
                  CustomButton(
                    text: 'Get Started',
                    onPressed: () {
                      // Add functionality
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}`,
    };
  }

  /**
   * Generate Flutter configuration
   */
  async generateFlutterConfig(request, context) {
    const appName = this.sanitizeAppName(request)
      .toLowerCase()
      .replace(/\s+/g, "_");

    return {
      "pubspec.yaml": `name: ${appName}
description: ${request}
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.6
  provider: ^6.1.1
  shared_preferences: ^2.2.2
  http: ^1.1.0
  path_provider: ^2.1.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.1

flutter:
  uses-material-design: true
  # assets:
  #   - assets/images/
  #   - assets/icons/`,
    };
  }

  /**
   * Generate .NET main window
   */
  async generateDotNetMain(request, context) {
    const prompt = `Generate .NET WPF MainWindow for: ${request}

Requirements:
- MVVM pattern
- Data binding
- Modern UI design
- Commands
- Dependency injection ready

Generate XAML and C# code.`;

    if (this.claude) {
      try {
        return await this.claude.generateWithFullContext(prompt, context);
      } catch (error) {
        console.error("Error generating .NET main:", error);
      }
    }

    // Fallback template
    return {
      "MainWindow.xaml": `<Window x:Class="App.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
        xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
        mc:Ignorable="d"
        Title="${request}" Height="600" Width="1000">
    <Grid>
        <Grid.Background>
            <LinearGradientBrush StartPoint="0,0" EndPoint="1,1">
                <GradientStop Color="#667eea" Offset="0"/>
                <GradientStop Color="#764ba2" Offset="1"/>
            </LinearGradientBrush>
        </Grid.Background>
        
        <Border Background="White" CornerRadius="10" Margin="50"
                Effect="{StaticResource DropShadow}">
            <Grid>
                <Grid.RowDefinitions>
                    <RowDefinition Height="Auto"/>
                    <RowDefinition Height="*"/>
                    <RowDefinition Height="Auto"/>
                </Grid.RowDefinitions>
                
                <TextBlock Text="${request}" 
                          FontSize="24" FontWeight="Bold"
                          Margin="20" HorizontalAlignment="Center"/>
                
                <StackPanel Grid.Row="1" VerticalAlignment="Center" 
                           HorizontalAlignment="Center">
                    <TextBox x:Name="InputBox" Width="300" Height="30"
                            Margin="10" Padding="5"/>
                    <Button x:Name="ActionButton" Content="Process"
                           Width="150" Height="40" Margin="10"
                           Click="ActionButton_Click"/>
                    <TextBlock x:Name="ResultText" Margin="10"
                              HorizontalAlignment="Center"/>
                </StackPanel>
                
                <StatusBar Grid.Row="2">
                    <StatusBarItem Content="Ready"/>
                </StatusBar>
            </Grid>
        </Border>
    </Grid>
    
    <Window.Resources>
        <DropShadowEffect x:Key="DropShadow" BlurRadius="20" 
                         ShadowDepth="5" Opacity="0.3"/>
    </Window.Resources>
</Window>`,
      "MainWindow.xaml.cs": `using System;
using System.Windows;

namespace App
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }

        private void ActionButton_Click(object sender, RoutedEventArgs e)
        {
            var input = InputBox.Text;
            if (!string.IsNullOrWhiteSpace(input))
            {
                // Process input
                ResultText.Text = $"Processing: {input}";
            }
            else
            {
                MessageBox.Show("Please enter some text", "Input Required", 
                               MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }
    }
}`,
    };
  }

  /**
   * Generate .NET UI components
   */
  async generateDotNetUI(request, context) {
    return {
      "ViewModels/MainViewModel.cs": `using System;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;

namespace App.ViewModels
{
    public class MainViewModel : INotifyPropertyChanged
    {
        private string _inputText;
        private string _outputText;

        public string InputText
        {
            get => _inputText;
            set
            {
                _inputText = value;
                OnPropertyChanged();
            }
        }

        public string OutputText
        {
            get => _outputText;
            set
            {
                _outputText = value;
                OnPropertyChanged();
            }
        }

        public ICommand ProcessCommand { get; }

        public MainViewModel()
        {
            ProcessCommand = new RelayCommand(ExecuteProcess);
        }

        private void ExecuteProcess(object parameter)
        {
            if (!string.IsNullOrWhiteSpace(InputText))
            {
                OutputText = $"Processed: {InputText}";
            }
        }

        public event PropertyChangedEventHandler PropertyChanged;

        protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }

    public class RelayCommand : ICommand
    {
        private readonly Action<object> _execute;
        private readonly Predicate<object> _canExecute;

        public RelayCommand(Action<object> execute, Predicate<object> canExecute = null)
        {
            _execute = execute;
            _canExecute = canExecute;
        }

        public event EventHandler CanExecuteChanged
        {
            add { CommandManager.RequerySuggested += value; }
            remove { CommandManager.RequerySuggested -= value; }
        }

        public bool CanExecute(object parameter)
        {
            return _canExecute?.Invoke(parameter) ?? true;
        }

        public void Execute(object parameter)
        {
            _execute(parameter);
        }
    }
}`,
    };
  }

  /**
   * Generate .NET configuration
   */
  async generateDotNetConfig(request, context) {
    const appName = this.sanitizeAppName(request);

    return {
      "App.csproj": `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWPF>true</UseWPF>
    <ApplicationIcon>app.ico</ApplicationIcon>
    <AssemblyName>${appName}</AssemblyName>
    <RootNamespace>${appName.replace(/\s+/g, "")}</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Configuration.Json" Version="8.0.0" />
  </ItemGroup>
</Project>`,
      "appsettings.json": {
        AppSettings: {
          Title: request,
          Version: "1.0.0",
          Theme: "Default",
        },
      },
    };
  }

  /**
   * Generate Python main
   */
  async generatePythonMain(request, context) {
    const prompt = `Generate Python desktop app using PyQt6 for: ${request}

Requirements:
- Modern PyQt6 design
- Main window with menu
- Responsive layout
- Event handling
- Cross-platform compatibility

Generate complete Python code.`;

    if (this.claude) {
      try {
        return await this.claude.generateWithFullContext(prompt, context);
      } catch (error) {
        console.error("Error generating Python main:", error);
      }
    }

    // Fallback template
    return `import sys
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                            QHBoxLayout, QPushButton, QLabel, QLineEdit,
                            QTextEdit, QMenuBar, QMenu, QMessageBox)
from PyQt6.QtCore import Qt, QThread, pyqtSignal
from PyQt6.QtGui import QAction, QFont, QPalette, QColor

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("${request}")
        self.setGeometry(100, 100, 1000, 600)
        
        # Set up the UI
        self.setup_ui()
        self.setup_menu()
        self.apply_styles()
        
    def setup_ui(self):
        # Central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Main layout
        layout = QVBoxLayout()
        central_widget.setLayout(layout)
        
        # Title
        title = QLabel("${request}")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setFont(QFont("Arial", 20, QFont.Weight.Bold))
        layout.addWidget(title)
        
        # Input section
        input_layout = QHBoxLayout()
        self.input_field = QLineEdit()
        self.input_field.setPlaceholderText("Enter text here...")
        self.process_button = QPushButton("Process")
        self.process_button.clicked.connect(self.process_input)
        
        input_layout.addWidget(self.input_field)
        input_layout.addWidget(self.process_button)
        layout.addLayout(input_layout)
        
        # Output section
        self.output_area = QTextEdit()
        self.output_area.setReadOnly(True)
        layout.addWidget(self.output_area)
        
        # Status bar
        self.statusBar().showMessage("Ready")
        
    def setup_menu(self):
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu("File")
        
        new_action = QAction("New", self)
        new_action.setShortcut("Ctrl+N")
        new_action.triggered.connect(self.new_file)
        file_menu.addAction(new_action)
        
        exit_action = QAction("Exit", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Help menu
        help_menu = menubar.addMenu("Help")
        about_action = QAction("About", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
        
    def apply_styles(self):
        self.setStyleSheet("""
            QMainWindow {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 #667eea, stop:1 #764ba2);
            }
            QWidget {
                font-family: 'Segoe UI', Arial, sans-serif;
            }
            QLineEdit {
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                background: white;
            }
            QPushButton {
                padding: 8px 15px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background: #5a67d8;
            }
            QTextEdit {
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                padding: 10px;
            }
        """)
        
    def process_input(self):
        text = self.input_field.text()
        if text:
            self.output_area.append(f"Processing: {text}")
            self.statusBar().showMessage("Processing complete", 2000)
            self.input_field.clear()
        else:
            QMessageBox.information(self, "Info", "Please enter some text")
            
    def new_file(self):
        self.output_area.clear()
        self.input_field.clear()
        self.statusBar().showMessage("New file created", 2000)
        
    def show_about(self):
        QMessageBox.about(self, "About", f"${request}\\nVersion 1.0.0\\nCreated with PyQt6")

def main():
    app = QApplication(sys.argv)
    
    # Set application style
    app.setStyle('Fusion')
    
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()`;
  }

  /**
   * Generate Python UI components
   */
  async generatePythonUI(request, context) {
    return {
      "widgets.py": `from PyQt6.QtWidgets import QWidget, QPushButton, QVBoxLayout, QLabel
from PyQt6.QtCore import pyqtSignal

class CustomButton(QPushButton):
    """Custom styled button widget"""
    
    def __init__(self, text, parent=None):
        super().__init__(text, parent)
        self.setStyleSheet("""
            QPushButton {
                background-color: #667eea;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #5a67d8;
            }
            QPushButton:pressed {
                background-color: #4c51bf;
            }
        """)

class InfoPanel(QWidget):
    """Information panel widget"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        
    def setup_ui(self):
        layout = QVBoxLayout()
        self.setLayout(layout)
        
        self.info_label = QLabel("Information Panel")
        self.info_label.setStyleSheet("""
            QLabel {
                background-color: #f0f0f0;
                padding: 15px;
                border-radius: 5px;
                color: #333;
            }
        """)
        layout.addWidget(self.info_label)
        
    def update_info(self, text):
        self.info_label.setText(text)`,
      "utils.py": `import json
import os
from pathlib import Path

class ConfigManager:
    """Manage application configuration"""
    
    def __init__(self, config_file="config.json"):
        self.config_file = Path.home() / ".${this.sanitizeAppName(request).toLowerCase()}" / config_file
        self.config = self.load_config()
        
    def load_config(self):
        """Load configuration from file"""
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                return json.load(f)
        return self.get_default_config()
        
    def save_config(self):
        """Save configuration to file"""
        self.config_file.parent.mkdir(exist_ok=True)
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)
            
    def get_default_config(self):
        """Get default configuration"""
        return {
            'window_size': [1000, 600],
            'theme': 'default',
            'recent_files': []
        }
        
    def get(self, key, default=None):
        """Get configuration value"""
        return self.config.get(key, default)
        
    def set(self, key, value):
        """Set configuration value"""
        self.config[key] = value
        self.save_config()`,
    };
  }

  /**
   * Generate Python configuration
   */
  async generatePythonConfig(request, context) {
    const appName = this.sanitizeAppName(request)
      .toLowerCase()
      .replace(/\s+/g, "_");

    return {
      "requirements.txt": `PyQt6==6.6.1
PyQt6-Qt6==6.6.1
PyQt6-sip==13.6.0
pyinstaller==6.3.0`,
      "setup.py": `from setuptools import setup, find_packages

setup(
    name="${appName}",
    version="1.0.0",
    description="${request}",
    packages=find_packages(),
    install_requires=[
        'PyQt6>=6.6.0',
    ],
    entry_points={
        'console_scripts': [
            '${appName}=main:main',
        ],
    },
    python_requires='>=3.8',
)`,
      "build.py": `import PyInstaller.__main__
import os

# Build executable
PyInstaller.__main__.run([
    'main.py',
    '--name=${appName}',
    '--windowed',
    '--onefile',
    '--icon=assets/icon.ico',
    '--add-data=assets;assets',
    '--clean',
    '--noconfirm',
])`,
    };
  }

  /**
   * Generate build scripts for all frameworks
   */
  async generateBuildScripts(request, framework) {
    const scripts = {
      electron: {
        "build.sh": `#!/bin/bash
npm install
npm run build
electron-builder --publish=never`,
        "build.bat": `@echo off
npm install
npm run build
electron-builder --publish=never`,
      },
      tauri: {
        "build.sh": `#!/bin/bash
npm install
npm run build
cd src-tauri
cargo build --release
cd ..
npm run tauri build`,
        "build.bat": `@echo off
npm install
npm run build
cd src-tauri
cargo build --release
cd ..
npm run tauri build`,
      },
      flutter: {
        "build.sh": `#!/bin/bash
flutter pub get
flutter build windows
flutter build macos
flutter build linux`,
        "build.bat": `@echo off
flutter pub get
flutter build windows`,
      },
      dotnet: {
        "build.sh": `#!/bin/bash
dotnet restore
dotnet build --configuration Release
dotnet publish --configuration Release --self-contained`,
        "build.bat": `@echo off
dotnet restore
dotnet build --configuration Release
dotnet publish --configuration Release --self-contained`,
      },
      python: {
        "build.sh": `#!/bin/bash
pip install -r requirements.txt
python build.py`,
        "build.bat": `@echo off
pip install -r requirements.txt
python build.py`,
      },
    };

    return scripts[framework] || scripts.electron;
  }

  /**
   * Generate setup instructions
   */
  generateSetupInstructions(framework) {
    const instructions = {
      electron: `## Electron App Setup

1. Install Node.js (v18 or higher)
2. Navigate to the project directory
3. Run: npm install
4. Development: npm start
5. Build: npm run build

### Platform-specific builds:
- Windows: npm run build:win
- macOS: npm run build:mac  
- Linux: npm run build:linux`,

      tauri: `## Tauri App Setup

1. Install prerequisites:
   - Node.js (v18+)
   - Rust (latest stable)
   - Platform build tools

2. Navigate to the project directory
3. Run: npm install
4. Run: cd src-tauri && cargo build
5. Development: npm run tauri dev
6. Build: npm run tauri build`,

      flutter: `## Flutter Desktop App Setup

1. Install Flutter SDK
2. Enable desktop support:
   - flutter config --enable-windows-desktop
   - flutter config --enable-macos-desktop
   - flutter config --enable-linux-desktop

3. Navigate to the project directory
4. Run: flutter pub get
5. Development: flutter run
6. Build: flutter build [windows/macos/linux]`,

      dotnet: `## .NET Desktop App Setup

1. Install .NET SDK (8.0 or higher)
2. Install Visual Studio (recommended) or VS Code
3. Navigate to the project directory
4. Run: dotnet restore
5. Development: dotnet run
6. Build: dotnet publish -c Release`,

      python: `## Python Desktop App Setup

1. Install Python (3.8 or higher)
2. Create virtual environment: python -m venv venv
3. Activate: 
   - Windows: venv\\Scripts\\activate
   - Unix: source venv/bin/activate
4. Install deps: pip install -r requirements.txt
5. Run: python main.py
6. Build exe: python build.py`,
    };

    return instructions[framework] || instructions.electron;
  }

  /**
   * Get fallback instructions if generation fails
   */
  getFallbackInstructions(framework) {
    return `Failed to generate ${framework} app automatically.

Manual setup instructions:
1. Create a new ${framework} project using official tools
2. Copy the generated code snippets as needed
3. Refer to official ${framework} documentation
4. Use the provided templates as starting points`;
  }

  /**
   * Parse architecture response
   */
  parseArchitectureResponse(response) {
    if (typeof response === "string") {
      return {
        overview: response,
        structure: this.extractStructureFromResponse(response),
      };
    }
    return response;
  }

  /**
   * Parse frontend response
   */
  parseFrontendResponse(response) {
    if (typeof response === "string") {
      // Try to extract different file contents
      const files = {};
      const htmlMatch = response.match(/```html([\s\S]*?)```/);
      const jsMatch = response.match(/```javascript([\s\S]*?)```/);
      const cssMatch = response.match(/```css([\s\S]*?)```/);

      if (htmlMatch) files["index.html"] = htmlMatch[1].trim();
      if (jsMatch) files["main.js"] = jsMatch[1].trim();
      if (cssMatch) files["style.css"] = cssMatch[1].trim();

      return Object.keys(files).length > 0 ? files : { "main.js": response };
    }
    return response;
  }

  /**
   * Extract HTML from response
   */
  extractHTMLFromResponse(response) {
    const match = response.match(/```html([\s\S]*?)```/);
    if (match) return match[1].trim();

    // Look for HTML-like content
    if (response.includes("<!DOCTYPE") || response.includes("<html")) {
      return response;
    }

    return this.getDefaultHTML();
  }

  /**
   * Extract JS from response
   */
  extractJSFromResponse(response) {
    const match = response.match(/```javascript([\s\S]*?)```/);
    if (match) return match[1].trim();

    const jsMatch = response.match(/```js([\s\S]*?)```/);
    if (jsMatch) return jsMatch[1].trim();

    return "// Add your JavaScript code here";
  }

  /**
   * Extract CSS from response
   */
  extractCSSFromResponse(response) {
    const match = response.match(/```css([\s\S]*?)```/);
    if (match) return match[1].trim();

    return this.getDefaultCSS();
  }

  /**
   * Extract structure from response
   */
  extractStructureFromResponse(response) {
    const lines = response.split("\n");
    const structure = [];

    for (const line of lines) {
      if (line.includes("├──") || line.includes("└──") || line.includes("│")) {
        structure.push(line);
      }
    }

    return structure.length > 0
      ? structure.join("\n")
      : "Standard project structure";
  }

  /**
   * Get default HTML template
   */
  getDefaultHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Desktop App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <h1>Desktop Application</h1>
        <div id="content">
            <!-- App content here -->
        </div>
    </div>
    <script src="renderer.js"></script>
</body>
</html>`;
  }

  /**
   * Get default CSS
   */
  getDefaultCSS() {
    return `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

#app {
    background: white;
    border-radius: 10px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    width: 100%;
}`;
  }

  /**
   * Get default architecture for framework
   */
  getDefaultArchitecture(framework) {
    const architectures = {
      electron: {
        overview: "Electron app with main and renderer processes",
        structure: `
├── main.js           # Main process
├── preload.js        # Preload script
├── index.html        # Main window HTML
├── renderer.js       # Renderer process
├── style.css         # Styles
├── package.json      # Dependencies
└── assets/           # Icons and resources`,
      },
      tauri: {
        overview: "Tauri app with Rust backend and web frontend",
        structure: `
├── src-tauri/        # Rust backend
│   ├── src/
│   │   └── main.rs   # Main Rust code
│   ├── Cargo.toml    # Rust dependencies
│   └── tauri.conf.json
├── src/              # Frontend
│   ├── index.html
│   ├── main.js
│   └── style.css
└── package.json`,
      },
      flutter: {
        overview: "Flutter desktop app with widget-based UI",
        structure: `
├── lib/
│   ├── main.dart     # Entry point
│   ├── screens/      # Screen widgets
│   └── widgets/      # Reusable widgets
├── windows/          # Windows specific
├── macos/            # macOS specific
├── linux/            # Linux specific
└── pubspec.yaml      # Dependencies`,
      },
      dotnet: {
        overview: ".NET WPF app with MVVM pattern",
        structure: `
├── MainWindow.xaml   # Main window UI
├── MainWindow.xaml.cs
├── ViewModels/       # MVVM ViewModels
├── Models/           # Data models
├── Views/            # Additional views
├── App.xaml          # Application config
└── *.csproj          # Project file`,
      },
      python: {
        overview: "Python desktop app with PyQt6",
        structure: `
├── main.py           # Entry point
├── widgets.py        # Custom widgets
├── utils.py          # Utility functions
├── requirements.txt  # Dependencies
├── build.py          # Build script
└── assets/           # Icons and resources`,
      },
    };

    return architectures[framework] || architectures.electron;
  }

  /**
   * Sanitize app name
   */
  sanitizeAppName(request) {
    return request
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
  }
}

export default DesktopCodeGenerator;
