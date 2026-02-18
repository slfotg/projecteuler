# projecteuler README

VSCode Extension that allows viewing Project Euler problems from your editor

## Features

A tree view panel in the Explorer view showing all current published problems. Clicking on an item will open that problem in a new tab.

![treeview](images/treeview.png)

A Webview for displaying Project Euler problems. All images and math equations are rendered properly. However there is currently no way to submit answers.

![webview](images/webview.png)

CodeLenses that allow links to open the webviews from comments or code in your editor.

![lens](images/lens.png)

Command palette search to search for and display problems by their problem number.

![search](images/search.png)

## Requirements

VSCode 1.109.0 or higher

## Extension Settings

This extension contributes the following settings:

* `projecteuler.enableCodeLens`: Enable/disable CodeLens links to problems (matching 'pe=###', 'problem=###' or 'problem = ###').

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

### 0.0.1

Initial release
