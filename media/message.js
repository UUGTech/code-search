(function() {
    const vscode = acquireVsCodeApi();
    
    const oldState = vscode.getState();

    window.addEventListener('message', event=>{
        const message = event.data;
        switch(message.command){
            case 'addTitle':
                const resultsDiv = document.getElementById('results-div');
                resultsDiv.innerHTML += `<h2 class="page-title">${message.title}</h2><div id="code-area-of-${message.num}"></div>`;
                break;
            case 'addCode':
                const codeArea = document.getElementById(`code-area-of-${message.num}`);
                const divElement = document.createElement('div');
                divElement.className = "code-frame";
                const codeElement = document.createElement('pre');
                codeElement.textContent = message.code;
                divElement.appendChild(codeElement);
                codeArea.appendChild(divElement);
                break;
            default:
                break;
        }
    });
}());