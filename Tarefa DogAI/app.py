import os
import requests
from bs4 import BeautifulSoup
import re
import concurrent.futures
import random
import time
from urllib.parse import urlparse
import logging
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Importações do Groq
from groq import Groq

# Configurações de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuração do cliente Groq
# IMPORTANTE: Defina sua GROQ_API_KEY como variável de ambiente
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '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')
groq_client = Groq(api_key=GROQ_API_KEY)

# Configuração do Flask
app = Flask(__name__, 
            static_folder='frontend',  # Pasta para arquivos estáticos
            static_url_path='')  # Serve arquivos direto da raiz

# Configurar CORS
CORS(app)

# Lista de fontes de informações sobre cachorros
DOG_SOURCES_PT = [
    "https://www.petz.com.br/cachorro/",
    "https://www.petlove.com.br/dicas/cachorros",
    "https://cobasi.com.br/mundo-animal/cachorros",
    "https://www.cachorrogato.com.br/cachorro/",
    "https://www.peritoanimal.com.br/cachorros/",
    "https://www.royalcanin.com/br/dogs/health-and-wellbeing",
    "https://www.purina.com.br/caes/artigos",
    "https://www.procao.com.br/",
    "https://www.cachorroseamigos.com.br/",
]

# Headers rotacionáveis para evitar bloqueios
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
]

def format_response_text(text):
    """
    Formata o texto para melhor legibilidade:
    - Adiciona espaçamento entre parágrafos
    - Quebra parágrafos de forma natural
    - Mantém a estrutura do texto original
    """
    # Dividir o texto em sentenças
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    # Agrupar sentenças em parágrafos
    paragraphs = []
    current_paragraph = []
    current_length = 0
    
    for sentence in sentences:
        # Limitar tamanho do parágrafo
        if current_length + len(sentence) > 250 or len(current_paragraph) >= 3:
            paragraphs.append(' '.join(current_paragraph))
            current_paragraph = []
            current_length = 0
        
        current_paragraph.append(sentence.strip())
        current_length += len(sentence)
    
    # Adicionar último parágrafo
    if current_paragraph:
        paragraphs.append(' '.join(current_paragraph))
    
    # Juntar parágrafos com linhas em branco
    formatted_text = '\n\n'.join(paragraphs)
    
    return formatted_text

def generate_groq_response(sources, query):
    """
    Gera uma resposta usando o Groq, incorporando informações das fontes
    """
    # Preparar contexto com fontes
    context = "\n\n".join([f"Fonte {i+1} ({source.get('source_url', 'Fonte Desconhecida')}): {source.get('content', '')}" 
                            for i, source in enumerate(sources)])
    
    # Prompt de sistema para guiar a resposta
    system_prompt = """
    Você é um assistente especializado em cuidados com cães. Sua tarefa é fornecer 
    respostas precisas e amigáveis sobre saúde, cuidados, adestramento e características 
    de cães. 

    Diretrizes:
    - Crie parágrafos bem estruturados e espaçados
    - Seja específico e informativo
    - Use linguagem amigável e acessível
    - Priorize a segurança e o bem-estar do animal
    - Divida a resposta em parágrafos distintos para facilitar a leitura
    - Se necessário, recomende consulta a um veterinário
    """

    try:
        # Chamada para o Groq com limite de tokens aumentado
        chat_completion = groq_client.chat.completions.create(
            model="llama3-70b-8192",  # Modelo mais capaz
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Contexto das fontes:\n{context}\n\nPergunta: {query}\n\nPor favor, responda de forma detalhada e clara."}
            ],
            max_tokens=1000,  # Aumentar limite de tokens para respostas mais longas
            temperature=0.7,  # Criatividade moderada
        )

        # Extrair resposta
        raw_response = chat_completion.choices[0].message.content
        
        # Formatar resposta
        formatted_response = format_response_text(raw_response)
        
        return formatted_response.strip()

    except Exception as e:
        logger.error(f"Erro no Groq: {e}")
        return "Desculpe, não foi possível processar sua pergunta no momento. Tente novamente mais tarde."

def fetch_content_from_source(url, query, timeout=10, retries=2):
    """
    Busca conteúdo de fonte confiável sobre cachorros
    """
    try:
        headers = {
            'User-Agent': random.choice(USER_AGENTS),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        
        # Parse do HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remover elementos indesejados
        for script in soup(["script", "style", "head", "header", "footer", "nav", "aside"]):
            script.decompose()
        
        # Extrair texto
        text = soup.get_text(separator=' ', strip=True)
        
        # Limpar texto
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'https?://\S+', '', text)
        
        # Extrair parágrafos relevantes
        paragraphs = [p for p in text.split('.') if len(p.split()) > 5]
        
        # Filtrar por relevância
        relevant_paragraphs = []
        query_words = query.lower().split()
        
        for paragraph in paragraphs:
            # Calcular relevância baseado em palavras-chave
            relevance = sum(word in paragraph.lower() for word in query_words)
            if relevance > 0:
                relevant_paragraphs.append({
                    'content': paragraph,
                    'source_url': url,
                    'relevance': relevance
                })
        
        # Ordenar por relevância
        relevant_paragraphs.sort(key=lambda x: x['relevance'], reverse=True)
        
        return relevant_paragraphs[:3]
    
    except Exception as e:
        logger.warning(f"Erro ao buscar conteúdo de {url}: {e}")
        return []

def search_dog_content(query, max_sources=5):
    """Busca conteúdo sobre cachorros em múltiplas fontes"""
    # Selecionar fontes aleatórias
    sources_to_search = random.sample(DOG_SOURCES_PT, min(max_sources * 2, len(DOG_SOURCES_PT)))
    
    # Buscar conteúdo em paralelo
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        # Mapear fontes para busca
        futures = {
            executor.submit(fetch_content_from_source, source, query): source 
            for source in sources_to_search
        }
        
        # Processar resultados
        for future in concurrent.futures.as_completed(futures):
            try:
                source_results = future.result()
                results.extend(source_results)
            except Exception as e:
                logger.error(f"Erro ao processar fonte: {e}")
    
    # Ordenar e limitar resultados
    results.sort(key=lambda x: x.get('relevance', 0), reverse=True)
    return results[:max_sources]

# Rota raiz para servir index.html
@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

# Endpoint de API para perguntas (com nome atualizado)
@app.route('/api/ask', methods=['POST'])
def handle_dog_query_updated():
    """Endpoint principal para consultas sobre cachorros"""
    try:
        # Receber dados da requisição
        data = request.json
        query = data.get('question', '').strip()
        
        # Validar entrada
        if not query or len(query) < 3:
            return jsonify({
                "error": "Consulta inválida. Por favor, forneça uma pergunta mais detalhada sobre cachorros.",
                "status": 400
            }), 400
        
        # Limite de 500 caracteres para prevenir abuso
        if len(query) > 500:
            query = query[:500]
        
        # Buscar conteúdo
        sources = search_dog_content(query)
        
        # Gerar resposta usando Groq
        answer = generate_groq_response(sources, query)
        
        # Preparar resposta
        response = {
            "question": query,
            "answer": answer,
            "sources": [
                {
                    "url": source.get('source_url', ''), 
                    "domain": urlparse(source.get('source_url', '')).netloc
                } for source in sources
            ],
            "status": 200
        }
        
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"Erro no processamento da consulta: {e}")
        return jsonify({
            "error": "Erro interno ao processar a consulta.",
            "status": 500
        }), 500

# Preparar frontend
def prepare_frontend():
    """
    Prepara a pasta frontend 
    """
    try:
        # Criar diretório frontend se não existir
        frontend_path = 'frontend'
        os.makedirs(frontend_path, exist_ok=True)
        
        # Caminho para o arquivo index.html
        index_path = os.path.join(frontend_path, 'index.html')
        
        # Verificar se o arquivo já existe
        if not os.path.exists(index_path):
            logger.info(f"Criando arquivo {index_path}")
            # HTML básico de fallback
            default_html = """
            <!DOCTYPE html>
            <html lang="pt-br">
            <head>
                <meta charset="UTF-8">
                <title>DogAI - Assistente Canino</title>
            </head>
            <body>
                <h1>DogAI - Em Manutenção</h1>
                <p>O site está sendo configurado. Por favor, tente novamente em breve.</p>
            </body>
            </html>
            """
            
            with open(index_path, 'w', encoding='utf-8') as f:
                f.write(default_html)
            
            logger.info(f"Arquivo {index_path} criado com sucesso")
    
    except Exception as e:
        logger.error(f"Erro ao preparar frontend: {e}")

# Configurações de execução
if __name__ == '__main__':
    # Preparar frontend
    prepare_frontend()
    
    # Executar o servidor
    app.run(
        host='0.0.0.0',  # Aceitar conexões de qualquer IP
        port=5000,       # Porta padrão
        debug=True       # Modo de depuração ativo
    )

"""
INSTRUÇÕES DE INSTALAÇÃO:

1. Instalar dependências:
   pip install flask flask-cors requests beautifulsoup4 groq

2. Configurar variável de ambiente para Groq:
   export GROQ_API_KEY='sua_chave_aqui'

3. Criar pasta frontend e copiar index.html original

4. Executar:
   python app.py

5. Acessar:
   http://localhost:5000
"""