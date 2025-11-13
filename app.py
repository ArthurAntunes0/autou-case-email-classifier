from flask import Flask, render_template, request, jsonify
import os
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from werkzeug.utils import secure_filename
import io
import json
import google.generativeai as genai # Importe a biblioteca do Google

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

# --- CONFIGURAÇÃO DA API DO GOOGLE ---
# Configura a API key a partir do arquivo .env
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Inicializa o modelo Gemini Pro
model = genai.GenerativeModel('gemini-1.0-pro')

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

# --- FUNÇÃO DE LÓGICA DA IA (MODIFICADA PARA GEMINI) ---
def classificar_email_com_ia(texto_do_email):
    """
    Usa a API do Google Gemini para classificar o e-mail e gerar uma resposta.
    """
    try:
        # O prompt é o mesmo, a estrutura do que pedimos não muda
        prompt = f"""
        Você é um assistente de IA especialista em triagem de e-mails para uma empresa do setor financeiro.
        Sua tarefa é analisar o e-mail abaixo, classificá-lo e sugerir uma resposta.

        O e-mail é:
        ---
        {texto_do_email}
        ---

        Siga estas instruções rigorosamente:
        1. Classifique o e-mail em uma das duas categorias: "Produtivo" ou "Improdutivo".
           - "Produtivo": Requer uma ação, como responder a uma dúvida, verificar um status, etc.
           - "Improdutivo": Não requer ação, como agradecimentos, felicitações, spam.
        2. Sugira uma resposta curta e profissional, adequada à classificação.
           - Se for Produtivo, a resposta deve ser proativa (ex: "Recebemos sua solicitação e nossa equipe já está verificando. Retornaremos em breve.").
           - Se for Improdutivo, a resposta deve ser cordial e curta (ex: "Agradecemos o contato!").
        3. Retorne sua análise EXCLUSIVAMENTE no seguinte formato JSON, sem nenhum texto adicional, markdown ou comentários. Apenas o JSON puro:
           {{
             "classificacao": "...",
             "resposta_sugerida": "..."
           }}
        """

        # --- CHAMADA PARA A API DO GEMINI ---
        response = model.generate_content(prompt)
        
        # O Gemini pode retornar a resposta com ```json ... ```. 
        # Precisamos limpar isso para garantir que tenhamos apenas o JSON.
        json_text = response.text.replace("```json", "").replace("```", "").strip()
        
        # Converte a string JSON limpa para um dicionário Python
        resultado_dict = json.loads(json_text)
        
        return resultado_dict

    except Exception as e:
        print(f"DEBUG: Erro detalhado da API Google Gemini: {e}") 
        return {"error": "Falha ao processar com a IA do Google. Verifique sua chave de API ou o prompt."}


# O restante do código permanece exatamente o mesmo, pois ele não se importa
# com qual IA está sendo usada, desde que receba o JSON de volta.

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/processar_email', methods=['POST'])
def processar_email():
    """
    Processa a requisição, extrai o conteúdo do e-mail e chama a IA.
    """
    try:
        email_content = ''
        
        if 'file' in request.files and request.files['file'].filename != '':
            file = request.files['file']
            filename = secure_filename(file.filename)
            
            if filename.endswith('.txt'):
                email_content = file.read().decode('utf-8')
            elif filename.endswith('.pdf'):
                pdf_file = io.BytesIO(file.read())
                pdf_reader = PdfReader(pdf_file)
                for page in pdf_reader.pages:
                    email_content += page.extract_text() + '\n'
            else:
                return jsonify({'error': 'Tipo de arquivo inválido. Suportamos apenas .txt e .pdf'}), 400
        else:
            email_content = request.form.get('email_content', '')
            if not email_content and request.is_json:
                email_content = request.get_json().get('email_content', '')
        
        if not email_content.strip():
            return jsonify({'error': 'Conteúdo do e-mail está vazio.'}), 400
        
        resultado_ia = classificar_email_com_ia(email_content)
        
        if "error" in resultado_ia:
            return jsonify(resultado_ia), 500
        
        return jsonify(resultado_ia), 200
        
    except Exception as e:
        print(f"DEBUG: Ocorreu um erro inesperado no endpoint: {e}")
        return jsonify({'error': f'Ocorreu um erro inesperado: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(debug=True)