import requests
import json
import os
import unicodedata
import re
from datetime import datetime
import random
from typing import Dict, Any, List
from urllib.parse import quote, urlencode
from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
from flask_cors import CORS

# Inicializar a aplicação Flask e configurar CORS para permitir o acesso do React
app = Flask(__name__, static_folder='static')
CORS(app)  # Habilita CORS para todas as rotas

# Chave da API OpenWeatherMap
WEATHER_API_KEY = 'a97daae463c8e2cf136e38345e303b2f'

def obter_informacoes_cidade(cidade, idioma='pt'):
    """Função melhorada para buscar informações sobre a cidade de múltiplas fontes"""
    try:
        # Tentar várias fontes em sequência
        # 1. Wikipedia (sem chave)
        def buscar_wikipedia(cidade, idioma='pt'):
            url = f"https://{idioma}.wikipedia.org/api/rest_v1/page/summary/{quote(cidade)}"
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                if 'extract' in data:
                    return data['extract']
            # Tentar com "cidade" no final
            url = f"https://{idioma}.wikipedia.org/api/rest_v1/page/summary/{quote(cidade)} cidade"
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                if 'extract' in data:
                    return data['extract']
            return None
        
        # 2. Geonames (gratuito com registro)
        def buscar_geonames(cidade):
            try:
                # Usando a API pública do GeoNames (limite de 1000 requisições/dia)
                url = f"http://api.geonames.org/searchJSON?q={quote(cidade)}&maxRows=1&username=demo"
                response = requests.get(url)
                if response.status_code == 200:
                    data = response.json()
                    if 'geonames' in data and data['geonames']:
                        place = data['geonames'][0]
                        info = f"{cidade} é uma localidade situada em {place.get('countryName', '')}. "
                        if 'population' in place and place['population']:
                            info += f"Tem uma população de aproximadamente {place['population']} habitantes. "
                        if 'lat' in place and 'lng' in place:
                            info += f"Está localizada nas coordenadas {place['lat']}, {place['lng']}. "
                        return info
            except Exception as e:
                print(f"Erro ao buscar no GeoNames: {e}")
            return None
        
        # 3. DBPedia (gratuito, dados da Wikipedia estruturados)
        def buscar_dbpedia(cidade, idioma='pt'):
            try:
                cidade_formatada = cidade.replace(' ', '_')
                url = f"https://{idioma}.dbpedia.org/data/{quote(cidade_formatada)}.json"
                response = requests.get(url)
                if response.status_code == 200:
                    data = response.json()
                    resource_uri = f"http://{idioma}.dbpedia.org/resource/{cidade_formatada}"
                    if resource_uri in data:
                        resource_data = data[resource_uri]
                        info = ""
                        # Extrair informações básicas
                        if "http://www.w3.org/2000/01/rdf-schema#comment" in resource_data:
                            comments = resource_data["http://www.w3.org/2000/01/rdf-schema#comment"]
                            for comment in comments:
                                if comment.get("lang") == idioma:
                                    info += f"{comment.get('value', '')} "
                        if info:
                            return info
            except Exception as e:
                print(f"Erro ao buscar no DBPedia: {e}")
            return None
        
        # Tentar todas as fontes em sequência
        informacoes = buscar_wikipedia(cidade, idioma)
        if not informacoes:
            informacoes = buscar_dbpedia(cidade, idioma)
        if not informacoes:
            informacoes = buscar_geonames(cidade)
        
        if informacoes:
            return {
                "sucesso": True,
                "resumo": informacoes
            }
        else:
            return {
                "sucesso": False,
                "mensagem": f"Não foram encontradas informações sobre {cidade}."
            }
    except Exception as e:
        return {
            "sucesso": False,
            "mensagem": f"Erro ao buscar informações: {str(e)}"
        }

# Função para obter ícone SVG com base nas condições meteorológicas
def obter_icone_clima(descricao, temperatura, e_dia=True):
    """
    Retorna um ícone SVG para a condição climática.
    Args:
        descricao: Descrição textual do clima (ex: "céu limpo", "chuva forte")
        temperatura: Temperatura em graus Celsius
        e_dia: True se for dia, False se for noite
    Returns:
        HTML do ícone SVG apropriado
    """
    # Mapeamento de condições para ícones do Weather Icons
    descricao_lower = descricao.lower()
    periodo = "day" if e_dia else "night"
    
    # Determinando o ícone com base na descrição e período
    if "chuva forte" in descricao_lower or "tempestade de chuva" in descricao_lower:
        icon_name = f"rain-{periodo}"
    elif "chuva" in descricao_lower or "chuvisco" in descricao_lower or "precipitação" in descricao_lower:
        icon_name = f"showers-{periodo}"
    elif "neve intensa" in descricao_lower or "nevasca" in descricao_lower:
        icon_name = "snow"
    elif "neve" in descricao_lower:
        icon_name = "snow"
    elif "trovoada" in descricao_lower or "relâmpago" in descricao_lower:
        icon_name = f"thunderstorms-{periodo}"
    elif "neblina" in descricao_lower or "névoa" in descricao_lower or "nevoeiro" in descricao_lower:
        icon_name = f"fog-{periodo}"
    elif "nublado" in descricao_lower or "encoberto" in descricao_lower:
        icon_name = f"cloudy-{periodo}"
    elif "poucas nuvens" in descricao_lower or "parcialmente nublado" in descricao_lower:
        icon_name = f"partly-cloudy-{periodo}"
    else:
        # Céu limpo
        icon_name = "clear-day" if e_dia else "clear-night"
    
    # Código OpenWeatherMap para o ícone - usado como fallback
    icon_code = get_weather_icon_code(descricao_lower, e_dia)
    
    return {
        "name": icon_name,
        "owm_icon": f"https://openweathermap.org/img/wn/{icon_code}@4x.png"
    }

def get_weather_icon_code(descricao, e_dia):
    """Determina o código do ícone do OpenWeatherMap com base na descrição."""
    # Mapeia a descrição para códigos de ícone do OpenWeatherMap
    if "chuva forte" in descricao or "tempestade" in descricao:
        icon_code = "10d" if e_dia else "10n"
    elif "chuva" in descricao or "chuvisco" in descricao or "precipitação" in descricao:
        icon_code = "09d" if e_dia else "09n"
    elif "neve" in descricao:
        icon_code = "13d" if e_dia else "13n"
    elif "trovoada" in descricao:
        icon_code = "11d" if e_dia else "11n"
    elif "neblina" in descricao or "névoa" in descricao or "nevoeiro" in descricao:
        icon_code = "50d" if e_dia else "50n"
    elif "nublado" in descricao or "encoberto" in descricao:
        icon_code = "04d" if e_dia else "04n"
    elif "poucas nuvens" in descricao or "parcialmente nublado" in descricao:
        icon_code = "02d" if e_dia else "02n"
    else:
        # Céu limpo ou padrão
        icon_code = "01d" if e_dia else "01n"
    
    return icon_code

# Função para obter fuso horário da cidade
def obter_fuso_horario(lat, lon):
    """Obtém o fuso horário com base nas coordenadas geográficas"""
    try:
        # Usar a API OneCall do OpenWeatherMap para obter dados do fuso horário
        timezone_url = f"https://api.openweathermap.org/data/2.5/onecall?lat={lat}&lon={lon}&exclude=minutely,hourly,daily,alerts&appid={WEATHER_API_KEY}"
        response = requests.get(timezone_url)
        data = response.json()
        
        # O deslocamento em segundos do UTC
        timezone_offset = data.get('timezone_offset', 0)
        timezone_name = data.get('timezone', '')
        
        # Verificar se temos um offset válido
        if timezone_offset is None or (timezone_offset == 0 and timezone_name == ''):
            print(f"ALERTA: Offset de fuso horário inválido para {lat}, {lon}. Usando dados do sistema.")
            # Fallback para o offset baseado na latitude aproximada
            if lon > 0:  # Leste
                timezone_offset = int(lon / 15) * 3600  # Aproximação: cada 15 graus = 1 hora
            else:  # Oeste
                timezone_offset = int(lon / 15) * 3600
        
        # Formatar o nome do fuso horário para exibição
        offset_hours = timezone_offset / 3600
        if offset_hours == 0:
            formatted_offset = "UTC"
        else:
            sign = "+" if offset_hours > 0 else ""
            formatted_offset = f"UTC{sign}{offset_hours:.1f}".replace('.0', '')
        
        # Se temos um nome de timezone, mostrar ambos
        if timezone_name:
            display_name = f"{timezone_name} ({formatted_offset})"
        else:
            display_name = formatted_offset
        
        print(f"Fuso horário calculado: {timezone_offset} segundos, '{display_name}'")
        
        return {
            "offset": timezone_offset,  # Em segundos
            "name": display_name
        }
    except Exception as e:
        print(f"Erro ao obter fuso horário: {e}")
        return {
            "offset": 0,
            "name": "UTC (Erro)"
        }

# Função para determinar um tema de cor baseado no clima atual
def obter_tema_clima(descricao, temperatura, e_dia=True):
    # Define temas de cores para diferentes condições climáticas
    
    # Dia quente e ensolarado: tons de amarelo e laranja
    if e_dia and "limpo" in descricao.lower() and temperatura > 28:
        return {
            "primary": "#ff6d00",
            "dark_primary": "#c43c00",
            "light_primary": "#ff9e40",
            "accent": "#2962ff",
            "background_gradient": "linear-gradient(135deg, #ffdc80, #ff9e40)"
        }
    
    # Dia ensolarado normal: tons de azul claro
    elif e_dia and "limpo" in descricao.lower():
        return {
            "primary": "#2196f3",
            "dark_primary": "#0069c0",
            "light_primary": "#6ec6ff",
            "accent": "#ff6d00",
            "background_gradient": "linear-gradient(135deg, #bbdefb, #e3f2fd)"
        }
    
    # Noite com céu limpo: tons de azul escuro
    elif not e_dia and "limpo" in descricao.lower():
        return {
            "primary": "#3f51b5",
            "dark_primary": "#002984",
            "light_primary": "#757de8",
            "accent": "#ffeb3b",
            "background_gradient": "linear-gradient(135deg, #303f9f, #1a237e)"
        }
    
    # Chuvoso: tons de azul escuro e cinza
    elif any(termo in descricao.lower() for termo in ["chuva", "chuvisco", "precipitação"]):
        return {
            "primary": "#0d47a1",
            "dark_primary": "#002171",
            "light_primary": "#5472d3",
            "accent": "#b0bec5",
            "background_gradient": "linear-gradient(135deg, #78909c, #b0bec5)"
        }
    
    # Tempestade: tons de roxo e azul escuro
    elif any(termo in descricao.lower() for termo in ["tempestade", "trovoada"]):
        return {
            "primary": "#4a148c",
            "dark_primary": "#12005e",
            "light_primary": "#7c43bd",
            "accent": "#ffd600",
            "background_gradient": "linear-gradient(135deg, #4a148c, #7c43bd)"
        }
    
    # Nublado: tons de cinza
    elif any(termo in descricao.lower() for termo in ["nublado", "nuvens", "encoberto"]):
        if e_dia:
            return {
                "primary": "#455a64",
                "dark_primary": "#1c313a",
                "light_primary": "#718792",
                "accent": "#26a69a",
                "background_gradient": "linear-gradient(135deg, #cfd8dc, #eceff1)"
            }
        else:
            # Nublado à noite: tons mais escuros
            return {
                "primary": "#263238",
                "dark_primary": "#000a12",
                "light_primary": "#4f5b62",
                "accent": "#26a69a",
                "background_gradient": "linear-gradient(135deg, #263238, #4f5b62)"
            }
    
    # Neve: tons de branco e azul claro
    elif any(termo in descricao.lower() for termo in ["neve", "nevasca"]):
        return {
            "primary": "#90caf9",
            "dark_primary": "#5d99c6",
            "light_primary": "#c3fdff",
            "accent": "#5d99c6",
            "background_gradient": "linear-gradient(135deg, #e1f5fe, #ffffff)"
        }
    
    # Névoa: tons pastel
    elif any(termo in descricao.lower() for termo in ["neblina", "névoa", "nevoeiro"]):
        if e_dia:
            return {
                "primary": "#b0bec5",
                "dark_primary": "#808e95",
                "light_primary": "#e2f1f8",
                "accent": "#607d8b",
                "background_gradient": "linear-gradient(135deg, #cfd8dc, #e2f1f8)"
            }
        else:
            # Névoa à noite: tons mais azulados
            return {
                "primary": "#78909c",
                "dark_primary": "#4b636e",
                "light_primary": "#a7c0cd",
                "accent": "#607d8b",
                "background_gradient": "linear-gradient(135deg, #546e7a, #78909c)"
            }
    
    # Padrão para dia: tema azul
    elif e_dia:
        return {
            "primary": "#2962ff",
            "dark_primary": "#0039cb",
            "light_primary": "#768fff",
            "accent": "#ff6d00",
            "background_gradient": "linear-gradient(135deg, #bbdefb, #e3f2fd)"
        }
    
    # Padrão para noite: tema azul escuro
    else:
        return {
            "primary": "#1a237e",
            "dark_primary": "#000051",
            "light_primary": "#534bae",
            "accent": "#ffab00",
            "background_gradient": "linear-gradient(135deg, #1a237e, #000051)"
        }

# Classe para obter curiosidades meteorológicas específicas sobre as cidades
class WeatherCuriosities:
    @staticmethod
    def get_climate_curiosities(cidade, lat, lon, pais, temperatura, descricao, umidade):
        try:
            # Obter dados climáticos mais detalhados usando a API OneCall do OpenWeather
            onecall_url = f"https://api.openweathermap.org/data/2.5/onecall?lat={lat}&lon={lon}&exclude=minutely&appid={WEATHER_API_KEY}&units=metric&lang=pt_br"
            response = requests.get(onecall_url)
            data = response.json()
            
            # Array para armazenar curiosidades
            curiosidades = []
            
            # 1. Curiosidades com base nos dados de alerta, se disponíveis
            if 'alerts' in data:
                for alert in data['alerts']:
                    curiosidades.append(f"Alerta meteorológico em {cidade}: {alert.get('description', 'Condições climáticas potencialmente perigosas')}.")
                    break # Limitar a um alerta
            
            # 2. Curiosidades sobre temperatura atual
            if temperatura > 35:
                curiosidades.append(f"Com {temperatura}°C, {cidade} está experimentando temperaturas extremamente altas. Em condições como esta, o corpo humano pode perder até 1 litro de suor por hora.")
            elif temperatura > 30:
                curiosidades.append(f"A temperatura atual de {temperatura}°C em {cidade} é considerada alta. Beber água regularmente é essencial para evitar desidratação.")
            elif temperatura < -20:
                curiosidades.append(f"Com {temperatura}°C, {cidade} está enfrentando frio extremo. Nessas condições, a pele exposta pode sofrer congelamento em menos de 10 minutos.")
            elif temperatura < 0:
                curiosidades.append(f"A temperatura atual de {temperatura}°C em {cidade} é negativa. Sabia que em temperaturas abaixo de zero, o sal é frequentemente usado em estradas pois reduz o ponto de congelamento da água?")
            
            # 3. Curiosidades sobre condições específicas
            if "chuv" in descricao.lower() or "precip" in descricao.lower():
                curiosidades.append(f"Durante uma chuva como a que ocorre agora em {cidade}, cada nuvem de tempestade contém, em média, milhões de toneladas de água.")
            elif "nev" in descricao.lower():
                curiosidades.append(f"Durante nevascas como a que ocorre em {cidade}, a neve pode atuar como isolante acústico, tornando o ambiente mais silencioso.")
            elif "nubla" in descricao.lower() or "nuvens" in descricao.lower():
                curiosidades.append(f"O céu nublado em {cidade} está cheio de nuvens que, dependendo do tipo, podem pesar centenas de toneladas e flutuar graças às correntes de ar ascendentes.")
            elif "limpo" in descricao.lower() or "céu limpo" in descricao.lower():
                curiosidades.append(f"Os dias de céu limpo em {cidade}, como hoje, permitem que a radiação solar atinja a superfície com maior intensidade.")
            
            # 4. Curiosidades sobre índice UV, se disponível
            if 'current' in data and 'uvi' in data['current']:
                uvi = data['current']['uvi']
                if uvi > 8:
                    curiosidades.append(f"O índice UV atual em {cidade} é muito alto ({uvi:.1f}). A proteção solar é essencial, pois a exposição pode causar queimaduras em menos de 15 minutos.")
                elif uvi > 5:
                    curiosidades.append(f"O índice UV atual em {cidade} é moderado a alto ({uvi:.1f}). Recomenda-se usar protetor solar e limitar a exposição durante o meio-dia.")
            
            # 5. Curiosidades sobre fenômenos extremos por região
            # Dados específicos para tipos de clima
            clima_extremos = {
                'deserto': [
                    f"{cidade} está localizada em uma região com características de deserto, onde a amplitude térmica diária pode ultrapassar 20°C devido à baixa umidade.",
                    f"Em regiões áridas como a de {cidade}, a precipitação anual é frequentemente inferior a 250mm, menos de 1/4 da média global."
                ],
                'tropical': [
                    f"{cidade} está em uma região tropical, onde as estações são definidas mais pela precipitação do que pela temperatura.",
                    f"Regiões tropicais como {cidade} geralmente recebem mais de 1500mm de chuva anualmente, distribuídos de forma desigual ao longo do ano."
                ],
                'temperado': [
                    f"{cidade} possui um clima temperado com quatro estações bem definidas, cada uma com sua própria característica meteorológica.",
                    f"Nos climas temperados como o de {cidade}, as árvores de folhas caducas são comuns pois se adaptaram às mudanças sazonais de temperatura."
                ],
                'polar': [
                    f"Em regiões de alta latitude como {cidade}, o sol pode não se pôr (ou nascer) durante parte do ano, criando os fenômenos de sol da meia-noite e noite polar.",
                    f"A temperatura média anual em regiões como {cidade} frequentemente permanece abaixo de 0°C por grande parte do ano."
                ],
                'montanha': [
                    f"Em regiões montanhosas como {cidade}, a temperatura cai cerca de 6,5°C a cada 1000 metros de altitude, criando diferentes zonas climáticas a curtas distâncias.",
                    f"Áreas elevadas como {cidade} frequentemente criam seus próprios microclimas devido à topografia e exposição ao sol."
                ]
            }
            
            # Classificação de climas por país
            paises_climas = {
                'BR': 'tropical',
                'US': 'temperado',
                'CA': 'temperado',
                'RU': 'polar',
                'AU': 'deserto',
                'SA': 'deserto',
                'JP': 'temperado',
                'CH': 'temperado',
                'IN': 'tropical',
                'MX': 'tropical',
                'EG': 'deserto',
                'NO': 'polar',
                'SE': 'polar',
                'FI': 'polar',
                'IS': 'polar',
                'NP': 'montanha',
                'CH': 'montanha',
                'AT': 'montanha'
            }
            
            # Definição de tipo de clima por temperatura e outras condições
            tipo_clima = 'temperado' # padrão
            
            # Determinar tipo de clima por país
            if pais in paises_climas:
                tipo_clima = paises_climas[pais]
            # Ou por temperatura e umidade
            elif temperatura > 30 and umidade < 40:
                tipo_clima = 'deserto'
            elif temperatura > 25 and umidade > 70:
                tipo_clima = 'tropical'
            elif temperatura < 0:
                tipo_clima = 'polar'
            
            # Adicionar uma curiosidade específica para o tipo de clima
            if tipo_clima in clima_extremos:
                curiosidades.append(random.choice(clima_extremos[tipo_clima]))
            
            # Curiosidades gerais sobre fenômenos meteorológicos se ainda não temos o suficiente
            if len(curiosidades) < 3:
                gerais = [
                    "Os raios atingem temperaturas de aproximadamente 27.000°C, cinco vezes mais quentes que a superfície do sol.",
                    "Em média, o planeta Terra é atingido por cerca de 100 raios por segundo.",
                    "Um furacão típico libera energia equivalente a 10.000 bombas nucleares.",
                    "As nuvens cumulonimbus podem atingir alturas de até 18 km, equivalente a duas vezes a altura do Monte Everest.",
                    "A temperatura mais alta já registrada na Terra foi de 56,7°C no Vale da Morte, Califórnia, em 1913.",
                    "A cidade mais chuvosa do mundo é Mawsynram, na Índia, com média anual de 11.871 mm."
                ]
                
                # Adicionar curiosidades gerais para completar
                for _ in range(min(3 - len(curiosidades), len(gerais))):
                    curiosidade = random.choice(gerais)
                    gerais.remove(curiosidade) # Evitar repetição
                    curiosidades.append(curiosidade)
            
            # Garantir que temos no máximo 3 curiosidades
            return {
                "sucesso": True,
                "curiosidades": curiosidades[:3]
            }
        except Exception as e:
            print(f"Erro ao obter curiosidades meteorológicas: {e}")
            return {
                "sucesso": False,
                "mensagem": "Não foi possível obter curiosidades meteorológicas específicas.",
                "erro": str(e)
            }

# Rota para servir a aplicação React
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Se o caminho não estiver vazio e existir no diretório static, envie o arquivo
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    
    # Caso contrário, envie o index.html para suportar o roteamento no lado do cliente
    if os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return send_from_directory(app.static_folder, 'index.html')
    else:
        # Fallback para o template Flask original se não houver React
        return render_template('index.html')

# API para obter previsão do tempo
@app.route('/api/weather', methods=['POST'])
def get_weather():
    try:
        data = request.json
        cidade = data.get('cidade', '')
        if not cidade:
            return jsonify({"error": "Por favor, forneça uma cidade", "sucesso": False}), 400
        
        # Obter coordenadas do local
        geo_url = f"http://api.openweathermap.org/geo/1.0/direct?q={cidade}&limit=1&appid={WEATHER_API_KEY}"
        geo_response = requests.get(geo_url)
        geo_data = geo_response.json()
        
        if not geo_data:
            return jsonify({"error": f"Local não encontrado: {cidade}", "sucesso": False}), 404
        
        lat = geo_data[0]['lat']
        lon = geo_data[0]['lon']
        nome_local = f"{geo_data[0].get('name', '')}, {geo_data[0].get('country', '')}"
        nome_cidade = geo_data[0].get('name', '')
        pais = geo_data[0].get('country', '')
        
        # Obter dados atuais
        current_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric&lang=pt_br"
        current_response = requests.get(current_url)
        current_data = current_response.json()
        
        # Verificar se é dia ou noite
        dt = current_data['dt']  # Timestamp atual
        sunrise = current_data.get('sys', {}).get('sunrise', 0)  # Nascer do sol
        sunset = current_data.get('sys', {}).get('sunset', 0)  # Pôr do sol
        e_dia = (dt > sunrise) and (dt < sunset)  # É dia se estiver entre nascer e pôr do sol
        
        # Obter previsão para 5 dias
        forecast_url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric&lang=pt_br"
        forecast_response = requests.get(forecast_url)
        forecast_data = forecast_response.json()
        
        # Obter fuso horário da cidade
        timezone_data = obter_fuso_horario(lat, lon)
        print(f"Fuso horário de {nome_cidade}: {timezone_data}")
        
        # Montar resumo do tempo
        resumo = f"Atualmente em {nome_local} está {current_data['weather'][0]['description']} com temperatura de {round(current_data['main']['temp'])}°C."
        resumo += f" A sensação térmica é de {round(current_data['main']['feels_like'])}°C com umidade de {current_data['main']['humidity']}%."
        if 'rain' in current_data:
            resumo += f" Há precipitação de {current_data.get('rain', {}).get('1h', 0)}mm na última hora."
        
        resumo += "\n\nPrevisão para os próximos dias:"
        
        # CORREÇÃO: Processar previsão para dias distintos
        dias_processados = set()
        previsao_diaria = []
        
        for item in forecast_data['list']:
            data = datetime.fromtimestamp(item['dt'])
            data_str = data.strftime('%Y-%m-%d')
            
            if data_str not in dias_processados:
                dias_processados.add(data_str)
                dia_semana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][data.weekday()]
                
                # Manter o modo de exibição (dia/noite) consistente com o frontend
                # Usando o mesmo período (dia/noite) da condição atual para todas as previsões
                previsao_e_dia = e_dia
                
                # Obter ícone para a previsão
                icone_info = obter_icone_clima(item['weather'][0]['description'], item['main']['temp'], previsao_e_dia)
                
                previsao_diaria.append({
                    'data': data_str,
                    'dia': dia_semana,
                    'temp': round(item['main']['temp']),
                    'temp_min': round(item['main']['temp_min']),
                    'temp_max': round(item['main']['temp_max']),
                    'descricao': item['weather'][0]['description'],
                    'icone': item['weather'][0]['icon'],
                    'umidade': item['main']['humidity'],
                    'vento': item['wind']['speed'],
                    'icone_nome': icone_info['name'],
                    'owm_icon': icone_info['owm_icon'],
                    'e_dia': previsao_e_dia  # IMPORTANTE: Usando o mesmo período (dia/noite) para todas as previsões
                })
                
                resumo += f"\n- {dia_semana}: {item['weather'][0]['description']}, máx. {round(item['main']['temp_max'])}°C, mín. {round(item['main']['temp_min'])}°C"
                
                if len(previsao_diaria) >= 5:
                    break
        
        # Obter informações da cidade
        info_cidade = obter_informacoes_cidade(nome_cidade)
        
        # Obter curiosidades meteorológicas
        temperatura_atual = current_data['main']['temp']
        descricao_atual = current_data['weather'][0]['description']
        umidade_atual = current_data['main']['humidity']
        
        weather_curiosities = WeatherCuriosities.get_climate_curiosities(
            nome_cidade, lat, lon, pais, temperatura_atual, descricao_atual, umidade_atual
        )
        
        # Obter tema de cores com base no clima
        tema = obter_tema_clima(descricao_atual, temperatura_atual, e_dia)
        
        # Obter ícone para o clima atual
        icone_atual = obter_icone_clima(descricao_atual, temperatura_atual, e_dia)
        
        return jsonify({
            'atual': {
                'cidade': nome_local,
                'temperatura': round(current_data['main']['temp']),
                'sensacao': round(current_data['main']['feels_like']),
                'descricao': current_data['weather'][0]['description'],
                'icone': current_data['weather'][0]['icon'],
                'umidade': current_data['main']['humidity'],
                'vento': current_data['wind']['speed'],
                'pressao': current_data['main']['pressure'],
                'lat': lat,
                'lon': lon,
                'icone_nome': icone_atual['name'],
                'owm_icon': icone_atual['owm_icon'],
                'e_dia': e_dia,
                'timezone_offset': timezone_data['offset'],
                'timezone_name': timezone_data['name']
            },
            'previsao': previsao_diaria,
            'resumo': resumo,
            'cidade_info': info_cidade,
            'curiosidades_meteo': weather_curiosities,
            'tema': tema,
            'sucesso': True
        })
    except Exception as e:
        print(f"Erro: {e}")
        return jsonify({"error": str(e), "sucesso": False}), 500

# Instruções para servir a aplicação React
def setup_react():
    """Configura o ambiente para servir a aplicação React"""
    # Criar diretório static se não existir
    if not os.path.exists('static'):
        os.makedirs('static', exist_ok=True)
        print("Diretório static criado. Coloque os arquivos build do React aqui.")
    else:
        print("Diretório static já existe. Verifique se contém os arquivos build do React.")
    
    # Verificar se o index.html existe
    if os.path.exists(os.path.join('static', 'index.html')):
        print("Aplicativo React encontrado!")
    else:
        print("ATENÇÃO: index.html não encontrado no diretório static.")
        print("Para utilizar o front-end React, siga as instruções:")
        print("1. Construa o aplicativo React (npm run build)")
        print("2. Copie o conteúdo do diretório 'build' para a pasta 'static'")

if __name__ == '__main__':
    # Configurar o ambiente para React
    setup_react()
    
    # Iniciar o servidor
    print("="*80)
    print("APLICAÇÃO WEATHERTIME - INICIANDO SERVIDOR")
    print("Acesse: http://localhost:5000")
    print("="*80)
    app.run(debug=True, host='0.0.0.0')