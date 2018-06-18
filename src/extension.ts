/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const animeRegex = /.*animejs.*/g;

export function activate(context: vscode.ExtensionContext) {

    let previewUri = vscode.Uri.parse('animejs-preview://authority/animejs-preview');
    let webviewJS = getMiscPath('main.js', context);
    let webviewCSS = getMiscPath('main.css', context);

    function getMiscPath(file: string, context: vscode.ExtensionContext, asUri = false): string {
        if (asUri) {
            return vscode.Uri.file(context.asAbsolutePath(path.join('media', file))).toString();
        }
        return vscode.Uri.file(context.asAbsolutePath(path.join('media', file))).fsPath;
    }

	class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
		private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

		public provideTextDocumentContent(uri: vscode.Uri): string {
            console.log('URI', uri);
			return this.createCssSnippet();
		}

		get onDidChange(): vscode.Event<vscode.Uri> {
			return this._onDidChange.event;
		}

		public update(uri: vscode.Uri) {
			this._onDidChange.fire(uri);
		}

		private createCssSnippet() {
			let editor = vscode.window.activeTextEditor;
			if (editor && !(editor.document.languageId === 'javascript')) {
				return this.errorSnippet("Active editor doesn't show a AnimeJS document - no properties to preview.")
			}
			return this.extractSnippet();
		}

		private extractSnippet(): string {
            let editor = vscode.window.activeTextEditor;
            if(!editor) {
                return '';
            }

			let text = editor.document.getText();

			let fileName = editor.document.fileName;

			let name = this.getAnimName(fileName);

			let previewHTML = this.loadPreviewHTML(fileName);
			let previewCSS = this.loadPreviewCSS(fileName);

            let r = this.exec(animeRegex, text);

            if(r) {
                text = text.substr(0, r.index) + text.substr(r.index + r[0].length, text.length);
            }

    		return this.snippet(name, text, previewHTML, previewCSS);
		}

		private getAnimName (fileName: string) {
			const r = /([a-zA-Z0-9]+)\.anime\.js/.exec(fileName);

			return r ? r[1] : '';
		}
		
		private loadPreviewHTML (fileName: String) {
			let preview = vscode.Uri.file(fileName.replace(/\.anime\.js/, '.preview.html'));

			try {
				return fs.readFileSync(preview.fsPath, {
					encoding: 'utf8'
				});
			} catch (e) {
				return '';
			}
		}

		private loadPreviewCSS (fileName: String) {
			let preview = vscode.Uri.file(fileName.replace(/\.anime\.js/, '.preview.css'));

			try {
				return fs.readFileSync(preview.fsPath, {
					encoding: 'utf8'
				});
			} catch (e) {
				return '';
			}
		}
        
        private exec (regex: RegExp, str: string): RegExpExecArray | null {
            regex.lastIndex = 0;
            return regex.exec(str);
        }

		private errorSnippet(error: string): string {
			return `
				<body>
					${error}
				</body>`;
		}

		private snippet(name: String, str: String, previewHTML: String, previewCSS: String): string {

            console.log(webviewJS);

            return `<html>
                <head>
                    <script src=${webviewJS}></script>
                    <link type="text/css" rel="stylesheet" href=${webviewCSS}></script>
					<script>
						window.addEventListener('load', function () {
							${str}
						});
					</script>
					<style>
						${previewCSS}
					</style>
                </head>
				<body>
					<h1>${name} Preview</h1>
					<div class="preview">
						${previewHTML}
					</div>
				</body>
            </html>`;
		}
	}

	let provider = new TextDocumentContentProvider();
	let registration = vscode.workspace.registerTextDocumentContentProvider('animejs-preview', provider);

	vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
		if (vscode.window.activeTextEditor && e.document === vscode.window.activeTextEditor.document) {
			provider.update(previewUri);
		}
	});

	vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
		if (e.textEditor === vscode.window.activeTextEditor) {
			provider.update(previewUri);
		}
	})

	let disposable = vscode.commands.registerCommand('extension.showAnimeJSPreview', () => {
		return vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Two, 'AnimeJS Preview').then((success) => {
		}, (reason) => {
			vscode.window.showErrorMessage(reason);
		});
	});

	let highlight = vscode.window.createTextEditorDecorationType({ backgroundColor: 'rgba(200,200,200,.35)' });

	vscode.commands.registerCommand('extension.revealAnimeJS', (uri: vscode.Uri, propStart: number, propEnd: number) => {

		for (let editor of vscode.window.visibleTextEditors) {
			if (editor.document.uri.toString() === uri.toString()) {
				let start = editor.document.positionAt(propStart);
				let end = editor.document.positionAt(propEnd + 1);

				editor.setDecorations(highlight, [new vscode.Range(start, end)]);
				setTimeout(() => editor.setDecorations(highlight, []), 1500);
			}
		}
	});

	context.subscriptions.push(disposable, registration);
}