/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import * as vscode from 'vscode';
import * as path from 'path';

const animeRegex = /.*animejs.*/g;

export function activate(context: vscode.ExtensionContext) {

    let previewUri = vscode.Uri.parse('animejs-preview://authority/animejs-preview');
    let webviewJS = getMiscPath('main.js', context);

    function getMiscPath(file: string, context: vscode.ExtensionContext, asUri = false): string {
        if (asUri) {
            return vscode.Uri.file(context.asAbsolutePath(path.join('media', file))).toString();
        }
        return vscode.Uri.file(context.asAbsolutePath(path.join('media', file))).fsPath;
    }

	class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
		private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
        private _uri: Object;

		public provideTextDocumentContent(uri: vscode.Uri): string {
            console.log('URI', uri);
            this._uri = uri;
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
            
            let r = this.exec(animeRegex, text);

            if(r) {
                text = text.substr(0, r.index) + text.substr(r.index + r[0].length, text.length);
            }

    		return this.snippet(text);
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

		private snippet(str: String): string {

            console.log(webviewJS);

            return `<html>
                <head>
                    <script>
                        window.addEventListener('load', function () {
                            document.querySelector('#html').addEventListener('change', function () {
                                document.querySelector('#root').innerHTML = this.value;
                                var evt = document.createEvent('Event');  
                                evt.initEvent('load', false, false);  
                                window.dispatchEvent(evt);
                            });
                        });
                    </script>
                    <script src=${webviewJS}></script>
                    <script>
                        ${str}
                    </script>
                </head>
                <body>
                    <div id="root"></div>
					<textarea id="html"></textarea>
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