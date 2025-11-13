document.addEventListener('DOMContentLoaded', () => {
    // --- SELEÇÃO DOS ELEMENTOS DO DOM ---
    const emailForm = document.getElementById('emailForm');
    const formContainer = document.querySelector('.form-container');
    const loader = document.getElementById('loader');
    const resultsContainer = document.getElementById('results');
    const errorMessage = document.getElementById('errorMessage');
    
    // Elementos de input e exibição
    const emailTextInput = document.getElementById('emailText');
    const fileInput = document.getElementById('emailFile');
    const fileNameDisplay = document.getElementById('fileName');
    
    // Elementos de resultado
    const classificationEl = document.getElementById('classification');
    const suggestedResponseEl = document.getElementById('suggestedResponse');
    const errorTextEl = document.getElementById('errorText');
    
    // Botões
    const copyBtn = document.getElementById('copyBtn');
    const newAnalysisBtn = document.getElementById('newAnalysisBtn');

    // --- LÓGICA DE INTERAÇÃO DA UI ---

    // Atualiza o nome do arquivo selecionado na interface
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = fileInput.files[0].name;
            emailTextInput.disabled = true; // Desabilita o textarea se um arquivo for selecionado
            emailTextInput.placeholder = 'Upload de arquivo priorizado. Limpe a seleção para usar o texto.';
        } else {
            fileNameDisplay.textContent = 'Nenhum arquivo selecionado';
            emailTextInput.disabled = false;
            emailTextInput.placeholder = 'Cole aqui o texto do e-mail que deseja analisar...';
        }
    });

    // --- FUNÇÃO PRINCIPAL: ENVIO DO FORMULÁRIO ---
    emailForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o recarregamento da página

        // Prepara os dados para envio
        const formData = new FormData();
        const file = fileInput.files[0];
        const text = emailTextInput.value;

        // Validação: verifica se há texto ou arquivo
        if (!file && !text.trim()) {
            displayError('Por favor, cole um texto ou selecione um arquivo para analisar.');
            return;
        }

        // Adiciona ao FormData o que foi preenchido
        if (file) {
            formData.append('file', file);
        } else {
            formData.append('email_content', text);
        }

        // Inicia o processo de análise
        showLoader();

        try {
            // Faz a requisição para o backend (API Flask)
            const response = await fetch('/processar_email', {
                method: 'POST',
                body: formData, // FormData lida com o formato correto (multipart/form-data)
            });

            const data = await response.json();

            if (!response.ok) {
                // Se a resposta do servidor for um erro (status 4xx ou 5xx)
                throw new Error(data.error || 'Ocorreu um erro no servidor.');
            }

            // Exibe os resultados se a requisição for bem-sucedida
            displayResults(data.classificacao, data.resposta_sugerida);

        } catch (error) {
            // Exibe a mensagem de erro em caso de falha na requisição
            displayError(error.message);
        } finally {
            // Esconde o loader, independentemente do resultado
            hideLoader();
        }
    });

    // --- FUNÇÕES AUXILIARES DE UI ---

    function showLoader() {
        formContainer.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        errorMessage.classList.add('hidden');
        loader.classList.remove('hidden');
    }

    function hideLoader() {
        loader.classList.add('hidden');
    }

    function displayResults(classification, response) {
        classificationEl.textContent = classification;
        // Adiciona uma classe para estilização condicional se desejar (ex: .produtivo, .improdutivo)
        classificationEl.className = `classification-text ${classification.toLowerCase()}`;
        
        suggestedResponseEl.textContent = response;
        
        resultsContainer.classList.remove('hidden');
    }

    function displayError(message) {
        errorTextEl.textContent = message;
        errorMessage.classList.remove('hidden');
        formContainer.classList.remove('hidden'); // Mostra o formulário novamente para o usuário corrigir
    }
    
    // --- LÓGICA DOS BOTÕES DE RESULTADO ---

    // Botão "Nova Análise"
    newAnalysisBtn.addEventListener('click', () => {
        // Limpa os campos e reseta a UI
        emailForm.reset();
        fileNameDisplay.textContent = 'Nenhum arquivo selecionado';
        emailTextInput.disabled = false;
        
        resultsContainer.classList.add('hidden');
        errorMessage.classList.add('hidden');
        formContainer.classList.remove('hidden');

        // Reseta o botão de copiar
        const copyBtnSpan = copyBtn.querySelector('span');
        copyBtn.classList.remove('copied');
        copyBtnSpan.textContent = '📋 Copiar Resposta';
    });

    // Botão "Copiar Resposta"
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(suggestedResponseEl.textContent).then(() => {
            const copyBtnSpan = copyBtn.querySelector('span');
            copyBtn.classList.add('copied');
            copyBtnSpan.textContent = '✅ Copiado!';
            
            // Volta ao texto original após 2 segundos
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtnSpan.textContent = '📋 Copiar Resposta';
            }, 2000);
        });
    });
});