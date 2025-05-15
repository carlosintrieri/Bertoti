import React, { useState, useEffect } from 'react';
import { Sun, Moon, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Search, MapPin, Wind, Droplets, BarChart2, ThermometerSnowflake, Clock, Info, ChevronDown, ChevronUp, Calendar, Navigation, Thermometer, Umbrella } from 'lucide-react';

const WeatherTime = () => {
  const [cidade, setCidade] = useState('');
  const [dadosClima, setDadosClima] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [secaoExpandida, setSecaoExpandida] = useState('previsao');
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [eDia, setEDia] = useState(true);
  const [cidades, setCidades] = useState(['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Curitiba']);

  useEffect(() => {
    // Atualizar hora atual a cada segundo
    const timer = setInterval(() => {
      setHoraAtual(new Date());
    }, 1000);
    
    // Verificar se é dia (entre 6h e 18h)
    const hora = new Date().getHours();
    setEDia(hora >= 6 && hora < 18);

    return () => clearInterval(timer);
  }, []);

  const alternarSecao = (secao) => {
    if (secaoExpandida === secao) {
      setSecaoExpandida(null);
    } else {
      setSecaoExpandida(secao);
    }
  };

  const buscarClima = async (cidadePesquisa = cidade) => {
    if (!cidadePesquisa.trim()) return;

    setCarregando(true);
    setErro(null);

    try {
      // Tentar fazer requisição para o backend Flask
      const resposta = await fetch('/api/weather', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cidade: cidadePesquisa })
      });
      
      // Se não conseguir conectar ao backend, usar dados simulados
      if (!resposta.ok) {
        // Simular dados para demonstração
        console.log("Usando dados simulados para demonstração");
        await new Promise(resolve => setTimeout(resolve, 1500));
        const dadosSimulados = gerarDadosSimulados(cidadePesquisa);
        setDadosClima(dadosSimulados);
        return;
      }
      
      const dados = await resposta.json();
      
      if (!dados.sucesso) {
        throw new Error(dados.error || "Não foi possível obter os dados dessa cidade");
      }
      
      setDadosClima(dados);
      
    } catch (err) {
      console.error("Erro ao buscar dados do clima:", err);
      
      // Se ocorrer um erro, usar dados simulados para demonstração
      console.log("Usando dados simulados após erro");
      await new Promise(resolve => setTimeout(resolve, 1000));
      const dadosSimulados = gerarDadosSimulados(cidadePesquisa);
      setDadosClima(dadosSimulados);
      
    } finally {
      setCarregando(false);
    }
  };

  const handlePesquisa = (e) => {
    if (e) e.preventDefault();
    buscarClima();
  };

  const handleCidadeClick = (cidadeSelecionada) => {
    setCidade(cidadeSelecionada);
    buscarClima(cidadeSelecionada);
  };

  // Função para gerar dados simulados com base no nome da cidade
  const gerarDadosSimulados = (nomeCidade) => {
    // Função para gerar número aleatório dentro de um intervalo
    const aleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
    
    // Determinar condições com base na primeira letra do nome da cidade
    const primeiraLetra = nomeCidade.charAt(0).toLowerCase();
    
    // Definir um período (dia ou noite) alinhado com o estado atual da aplicação
    const periodoAtual = eDia;
    
    // Condições possíveis
    const condicoes = [
      { descricao: 'Céu limpo', probabilidade: 0.25 },
      { descricao: 'Poucas nuvens', probabilidade: 0.2 },
      { descricao: 'Nublado', probabilidade: 0.2 },
      { descricao: 'Chuva leve', probabilidade: 0.15 },
      { descricao: 'Chuva forte', probabilidade: 0.1 },
      { descricao: 'Neblina', probabilidade: 0.1 }
    ];
    
    // Selecionar condição baseada em um número aleatório
    let r = Math.random();
    let condicaoAtual = condicoes[0].descricao;
    let somaProbabilidade = 0;
    
    for (const condicao of condicoes) {
      somaProbabilidade += condicao.probabilidade;
      if (r <= somaProbabilidade) {
        condicaoAtual = condicao.descricao;
        break;
      }
    }
    
    // Gerar temperatura com base na condição
    let tempBase = 0;
    if (condicaoAtual.includes('limpo')) {
      tempBase = periodoAtual ? aleatorio(25, 35) : aleatorio(15, 25);
    } else if (condicaoAtual.includes('nuvens') || condicaoAtual.includes('Nublado')) {
      tempBase = periodoAtual ? aleatorio(20, 30) : aleatorio(12, 20);
    } else if (condicaoAtual.includes('Chuva')) {
      tempBase = periodoAtual ? aleatorio(18, 25) : aleatorio(10, 18);
    } else if (condicaoAtual.includes('Neblina')) {
      tempBase = periodoAtual ? aleatorio(15, 22) : aleatorio(8, 15);
    }
    
    // Gerar previsão para os próximos dias
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const hoje = new Date();
    const previsao = Array(5).fill().map((_, i) => {
      const dataPrevisao = new Date();
      dataPrevisao.setDate(hoje.getDate() + i + 1);
      
      // Decidir se o dia está usando o mesmo período (dia/noite) que o atual
      const diaPrevisao = periodoAtual;
      
      // Gerar uma condição para o dia
      let condicaoPrevisao = condicoes[aleatorio(0, condicoes.length - 1)].descricao;
      
      // Gerar temperatura com base na condição
      let tempBasePrevisao = 0;
      if (condicaoPrevisao.includes('limpo')) {
        tempBasePrevisao = diaPrevisao ? aleatorio(25, 35) : aleatorio(15, 25);
      } else if (condicaoPrevisao.includes('nuvens') || condicaoPrevisao.includes('Nublado')) {
        tempBasePrevisao = diaPrevisao ? aleatorio(20, 30) : aleatorio(12, 20);
      } else if (condicaoPrevisao.includes('Chuva')) {
        tempBasePrevisao = diaPrevisao ? aleatorio(18, 25) : aleatorio(10, 18);
      } else if (condicaoPrevisao.includes('Neblina')) {
        tempBasePrevisao = diaPrevisao ? aleatorio(15, 22) : aleatorio(8, 15);
      }
      
      return {
        data: dataPrevisao.toISOString().split('T')[0],
        dia: diasSemana[dataPrevisao.getDay()],
        temp: tempBasePrevisao,
        temp_min: tempBasePrevisao - aleatorio(2, 5),
        temp_max: tempBasePrevisao + aleatorio(2, 5),
        descricao: condicaoPrevisao,
        icone: 'icon-code',
        umidade: aleatorio(30, 90),
        vento: (Math.random() * 10).toFixed(1),
        e_dia: diaPrevisao
      };
    });
    
    // Gerar dados de cidade
    const resumoCidade = `${nomeCidade} é uma cidade ${aleatorio(0, 1) ? 'importante' : 'histórica'} localizada na região ${aleatorio(0, 1) ? 'central' : aleatorio(0, 1) ? 'sul' : 'norte'} do Brasil. Com uma população estimada de ${(aleatorio(50, 1500) / 100).toFixed(1)} milhões de habitantes, a cidade é conhecida por ${aleatorio(0, 1) ? 'sua culinária regional' : aleatorio(0, 1) ? 'seus pontos turísticos' : 'sua rica história cultural'}.`;
    
    // Gerar curiosidades meteorológicas
    const curiosidades = [
      `A temperatura média anual em ${nomeCidade} é de ${aleatorio(18, 28)}°C, com variações significativas entre as estações.`,
      `${nomeCidade} possui um clima ${aleatorio(0, 1) ? 'tropical' : aleatorio(0, 1) ? 'subtropical' : 'temperado'}, com ${aleatorio(0, 1) ? 'estações bem definidas' : 'pequena variação ao longo do ano'}.`,
      `A precipitação média anual em ${nomeCidade} é de ${aleatorio(800, 2000)}mm, concentrada principalmente nos meses de ${aleatorio(0, 1) ? 'verão' : 'inverno'}.`
    ];
    
    // Gerar dados completos
    return {
      atual: {
        cidade: `${nomeCidade}, BR`,
        temperatura: tempBase,
        sensacao: tempBase + aleatorio(-3, 3),
        descricao: condicaoAtual,
        icone: 'icon-code',
        umidade: aleatorio(30, 90),
        vento: (Math.random() * 10).toFixed(1),
        pressao: aleatorio(1000, 1030),
        lat: (Math.random() * 10 - 5 + -23.5505).toFixed(4), // Aproximadamente Brasil
        lon: (Math.random() * 10 - 5 + -46.6333).toFixed(4), // Aproximadamente Brasil
        icone_nome: 'icon-name',
        e_dia: periodoAtual,
        timezone_offset: -10800, // UTC-3 (Brasil)
        timezone_name: 'Horário de Brasília (GMT-3)'
      },
      previsao: previsao,
      resumo: `Atualmente em ${nomeCidade}, BR está ${condicaoAtual.toLowerCase()} com temperatura de ${tempBase}°C. A sensação térmica é de ${tempBase + aleatorio(-3, 3)}°C com umidade de ${aleatorio(30, 90)}%.\n\nPrevisão para os próximos dias:\n${previsao.map(dia => `- ${dia.dia}: ${dia.descricao.toLowerCase()}, máx. ${dia.temp_max}°C, mín. ${dia.temp_min}°C`).join('\n')}`,
      cidade_info: {
        sucesso: true,
        resumo: resumoCidade
      },
      curiosidades_meteo: {
        sucesso: true,
        curiosidades: curiosidades
      },
      tema: {
        primary: "#2962ff",
        dark_primary: "#0039cb",
        light_primary: "#768fff",
        accent: "#ff6d00",
        background_gradient: "linear-gradient(135deg, #bbdefb, #e3f2fd)"
      },
      sucesso: true
    };
  };

  // Função para obter o ícone apropriado para cada condição climática
  const getIconeClima = (condicao, eDia, tamanho = 24) => {
    condicao = condicao?.toLowerCase() || '';
    
    if (condicao.includes('limpo') || condicao.includes('céu limpo')) {
      return eDia ? <Sun size={tamanho} className="text-yellow-500" /> : <Moon size={tamanho} className="text-blue-300" />;
    } else if (condicao.includes('chuva') || condicao.includes('chuvisco')) {
      return <CloudRain size={tamanho} className="text-blue-500" />;
    } else if (condicao.includes('neve')) {
      return <CloudSnow size={tamanho} className="text-blue-200" />;
    } else if (condicao.includes('trovoada') || condicao.includes('relâmpago')) {
      return <CloudLightning size={tamanho} className="text-purple-500" />;
    } else if (condicao.includes('neblina') || condicao.includes('névoa') || condicao.includes('nevoeiro')) {
      return <CloudFog size={tamanho} className="text-gray-400" />;
    } else if (condicao.includes('nublado') || condicao.includes('nuvens')) {
      return <Cloud size={tamanho} className="text-gray-500" />;
    } else {
      return eDia ? <Sun size={tamanho} className="text-yellow-500" /> : <Moon size={tamanho} className="text-blue-300" />;
    }
  };

  const getClasseBackground = (condicao, eDia) => {
    condicao = condicao?.toLowerCase() || '';
    
    if (eDia) {
      if (condicao.includes('limpo') || condicao.includes('céu limpo')) {
        return 'bg-gradient-day-clear';
      } else if (condicao.includes('chuva') || condicao.includes('chuvisco')) {
        return 'bg-gradient-day-rain';
      } else if (condicao.includes('neve')) {
        return 'bg-[linear-gradient(135deg,#e1f5fe,#ffffff)]';
      } else if (condicao.includes('trovoada') || condicao.includes('relâmpago')) {
        return 'bg-[linear-gradient(135deg,#4a148c,#7c43bd)]';
      } else if (condicao.includes('neblina') || condicao.includes('névoa')) {
        return 'bg-[linear-gradient(135deg,#cfd8dc,#e2f1f8)]';
      } else if (condicao.includes('nublado') || condicao.includes('nuvens')) {
        return 'bg-[linear-gradient(135deg,#cfd8dc,#eceff1)]';
      } else {
        return 'bg-gradient-day-clear';
      }
    } else {
      // Temas para noite (mais escuros)
      if (condicao.includes('limpo') || condicao.includes('céu limpo')) {
        return 'bg-gradient-night-clear';
      } else if (condicao.includes('chuva') || condicao.includes('chuvisco')) {
        return 'bg-[linear-gradient(135deg,#263238,#4f5b62)]';
      } else if (condicao.includes('neve')) {
        return 'bg-[linear-gradient(135deg,#263238,#4f5b62)]';
      } else if (condicao.includes('trovoada') || condicao.includes('relâmpago')) {
        return 'bg-[linear-gradient(135deg,#12005e,#4a148c)]';
      } else if (condicao.includes('neblina') || condicao.includes('névoa')) {
        return 'bg-[linear-gradient(135deg,#546e7a,#78909c)]';
      } else if (condicao.includes('nublado') || condicao.includes('nuvens')) {
        return 'bg-[linear-gradient(135deg,#263238,#4f5b62)]';
      } else {
        return 'bg-gradient-night-clear';
      }
    }
  };

  const getGradienteCard = (condicao, eDia) => {
    condicao = condicao?.toLowerCase() || '';
    
    // Aplicando classes diretamente com estilo inline para garantir que funcione
    let gradiente = 'bg-white/80 backdrop-blur-md';
    
    return gradiente;
  };

  const getIconeAnimado = (condicao, eDia) => {
    condicao = condicao?.toLowerCase() || '';
    
    if (condicao.includes('limpo') || condicao.includes('céu limpo')) {
      if (eDia) {
        return (
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-yellow-500 rounded-full animate-pulse"></div>
            </div>
            <Sun size={160} className="text-yellow-300 relative z-10" />
          </div>
        );
      } else {
        return (
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 bg-blue-900 rounded-full"></div>
            </div>
            <Moon size={160} className="text-blue-200 relative z-10" />
            <div className="absolute top-0 right-0 left-0 bottom-0 overflow-hidden">
              {Array(20).fill().map((_, i) => (
                <div 
                  key={i}
                  className="absolute bg-white rounded-full w-1 h-1 animate-twinkle"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    opacity: Math.random() * 0.8 + 0.2,
                    animationDelay: `${Math.random() * 3}s`
                  }}
                ></div>
              ))}
            </div>
          </div>
        );
      }
    } else if (condicao.includes('chuva') || condicao.includes('chuvisco')) {
      return (
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-20 bg-gray-400 rounded-full"></div>
          </div>
          <CloudRain size={160} className="text-gray-400 relative z-10" />
          <div className="absolute bottom-0 left-0 right-0 h-20 overflow-hidden">
            {Array(10).fill().map((_, i) => (
              <div 
                key={i}
                className="absolute bg-blue-400 rounded-full w-1 h-6 animate-rain"
                style={{
                  left: `${10 + (i * 8)}%`,
                  animationDelay: `${Math.random() * 0.5}s`
                }}
              ></div>
            ))}
          </div>
        </div>
      );
    } else if (condicao.includes('neve')) {
      return (
        <div className="relative">
          <CloudSnow size={160} className="text-gray-300 relative z-10" />
          <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden">
            {Array(15).fill().map((_, i) => (
              <div 
                key={i}
                className="absolute bg-white rounded-full w-2 h-2 animate-snow"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              ></div>
            ))}
          </div>
        </div>
      );
    } else if (condicao.includes('trovoada') || condicao.includes('relâmpago')) {
      return (
        <div className="relative">
          <CloudLightning size={160} className="text-gray-600 relative z-10" />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-24 bg-yellow-300 animate-lightning"
            style={{ clipPath: 'polygon(50% 0%, 0% 100%, 50% 65%, 100% 100%)' }}
          ></div>
        </div>
      );
    } else if (condicao.includes('neblina') || condicao.includes('névoa') || condicao.includes('nevoeiro')) {
      return (
        <div className="relative overflow-hidden">
          <CloudFog size={160} className="text-gray-400 relative z-10" />
          <div className="absolute inset-0">
            {Array(5).fill().map((_, i) => (
              <div 
                key={i}
                className="absolute bg-gray-300/50 h-4 w-full rounded-full animate-fog"
                style={{
                  top: `${20 + i * 15}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  left: `${Math.random() * 100 - 100}%`
                }}
              ></div>
            ))}
          </div>
        </div>
      );
    } else if (condicao.includes('nublado') || condicao.includes('nuvens')) {
      return (
        <div className="relative">
          <div className="absolute top-1/4 left-1/4 w-32 h-20 bg-gray-300 rounded-full"></div>
          <div className="absolute top-1/3 right-1/4 w-28 h-16 bg-gray-400 rounded-full"></div>
          <Cloud size={160} className="text-gray-400 relative z-10" />
          <div className="absolute top-1/2 left-1/3 w-30 h-18 bg-gray-200 rounded-full"></div>
        </div>
      );
    } else {
      if (eDia) {
        return <Sun size={160} className="text-yellow-500" />;
      } else {
        return <Moon size={160} className="text-blue-300" />;
      }
    }
  };
  
  const formatarData = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  // Cor de texto padrão para todo o aplicativo - azul marinho
  const textColor = "#00008B";

  return (
    <div 
      className="min-h-screen transition-all duration-1000 ease-in-out"
      style={{
        background: dadosClima 
          ? (dadosClima.atual.e_dia 
              ? 'linear-gradient(135deg, #bbdefb, #e3f2fd)'  // dia
              : 'linear-gradient(135deg, #1a237e, #000051)') // noite
          : (eDia 
              ? 'linear-gradient(135deg, #bbdefb, #e3f2fd)'  // dia
              : 'linear-gradient(135deg, #1a237e, #000051)') // noite
      }}
    >
      {/* Partículas de fundo (estrelas à noite, bolhas durante o dia) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {eDia ? (
          // Bolhas do dia
          Array(15).fill().map((_, i) => (
            <div 
              key={i}
              className="absolute bg-white/20 rounded-full"
              style={{
                width: `${Math.random() * 50 + 10}px`,
                height: `${Math.random() * 50 + 10}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `float ${Math.random() * 15 + 15}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 10}s`
              }}
            ></div>
          ))
        ) : (
          // Estrelas à noite
          Array(100).fill().map((_, i) => (
            <div 
              key={i}
              className="absolute bg-white rounded-full"
              style={{
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.8 + 0.2,
                animation: `twinkle ${Math.random() * 5 + 3}s linear infinite`
              }}
            ></div>
          ))
        )}
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Cabeçalho */}
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold drop-shadow-lg flex justify-center items-center gap-2" style={{ color: eDia ? textColor : "#FFFFFF" }}>
            <span style={{ color: "#FFC107" }}>Weather</span>
            <span style={{
              background: eDia ? 'linear-gradient(to right, #00008B, #0000CD)' : 'linear-gradient(to right, #e3f2fd, #ffffff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Time</span>
            {eDia ? 
              <Sun className="text-yellow-300" style={{animation: 'pulse 2s infinite'}} size={40} /> : 
              <Moon className="text-blue-300" style={{animation: 'pulse 2s infinite'}} size={40} />
            }
          </h1>
          <p style={{ color: eDia ? textColor : "#FFFFFF" }} className="text-lg mt-2 opacity-90">Sua previsão do tempo detalhada e personalizada</p>
        </header>

        {/* Formulário de busca */}
        <div className="max-w-md mx-auto mb-8">
          <form onSubmit={handlePesquisa} className="flex" style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            borderRadius: '9999px',
            padding: '0.25rem'
          }}>
            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Digite o nome da cidade..."
              className="flex-grow px-4 py-2 focus:outline-none"
              style={{
                background: 'transparent',
                borderRadius: '9999px',
                color: textColor
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handlePesquisa();
                }
              }}
            />
            <button 
              type="submit" 
              className="rounded-full p-2 transition"
              style={{
                background: '#00008B',
                color: 'white'
              }}
              disabled={carregando}
            >
              {carregando ? (
                <div style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              ) : (
                <Search size={24} />
              )}
            </button>
          </form>
          {erro && (
            <div className="mt-2 rounded-lg p-2 text-sm text-center" style={{
              background: 'rgba(239, 68, 68, 0.7)',
              color: 'white'
            }}>
              {erro}
            </div>
          )}
        </div>

        {/* Sugestões de cidades populares */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="text-center mb-3">
            <h3 className="text-sm" style={{ color: eDia ? textColor : "#FFFFFF" }}>Cidades Populares</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {cidades.map((cidadeSugerida, index) => (
              <button
                key={index}
                onClick={() => handleCidadeClick(cidadeSugerida)}
                className="px-3 py-1 rounded-full text-sm transition-all transform hover:scale-105"
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(8px)',
                  color: textColor,
                  fontWeight: 'bold'
                }}
              >
                {cidadeSugerida}
              </button>
            ))}
          </div>
        </div>

        {/* Informações do horário atual */}
        <div className="max-w-4xl mx-auto mb-6 flex justify-center">
          <div className="flex items-center p-3 rounded-xl shadow-lg" style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)'
          }}>
            <div className="rounded-full p-2 mr-3" style={{
              background: 'rgba(0, 0, 139, 0.3)'
            }}>
              <Clock size={24} style={{ color: textColor }} />
            </div>
            <div>
              <div className="text-2xl font-mono" style={{ color: textColor }}>
                {horaAtual.toLocaleTimeString('pt-BR')}
              </div>
              <div style={{ color: textColor }} className="text-sm opacity-80">
              </div>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {carregando && (
          <div className="flex flex-col items-center justify-center p-8">
            <div style={{
              width: '4rem',
              height: '4rem',
              border: '4px solid rgba(0, 0, 139, 0.3)',
              borderTop: '4px solid rgba(0, 0, 139, 1)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '1rem'
            }}></div>
            <p style={{ color: eDia ? textColor : "#FFFFFF" }} className="text-xl">Buscando dados do clima...</p>
          </div>
        )}

        {/* Estado inicial - Sem busca realizada */}
        {!dadosClima && !carregando && (
          <div className="max-w-4xl mx-auto">
            <div className="p-8 text-center rounded-2xl shadow-xl" style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)'
            }}>
              <div className="mb-6">
                {eDia ? (
                  <div className="flex justify-center">
                    <div className="relative w-40 h-40">
                      <div className="absolute inset-0 bg-yellow-500 rounded-full opacity-50" style={{animation: 'pulse 2s infinite'}}></div>
                      <Sun size={160} className="text-yellow-300 relative z-10" />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="relative w-40 h-40">
                      <Moon size={160} className="text-blue-300 relative z-10" />
                      <div className="absolute top-0 right-0 left-0 bottom-0 overflow-hidden">
                        {Array(20).fill().map((_, i) => (
                          <div 
                            key={i}
                            className="absolute bg-white rounded-full w-1 h-1"
                            style={{
                              top: `${Math.random() * 100}%`,
                              left: `${Math.random() * 100}%`,
                              opacity: Math.random() * 0.8 + 0.2,
                              animation: `twinkle ${Math.random() * 3 + 2}s linear infinite`
                            }}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <h2 style={{ color: textColor }} className="text-2xl font-semibold mb-3">Descubra o clima em tempo real</h2>
              <p style={{ color: textColor }} className="mb-6">Digite o nome de uma cidade acima para obter informações meteorológicas detalhadas</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="rounded-xl p-4 flex flex-col items-center" style={{
                  background: 'rgba(0, 0, 139, 0.1)'
                }}>
                  <Thermometer style={{ color: '#1E40AF' }} className="mb-2" size={36} />
                  <h3 style={{ color: textColor }} className="font-medium mb-1">Temperatura</h3>
                  <p style={{ color: textColor }} className="text-sm text-center">Dados precisos de temperatura atual e sensação térmica</p>
                </div>
                
                <div className="rounded-xl p-4 flex flex-col items-center" style={{
                  background: 'rgba(0, 0, 139, 0.1)'
                }}>
                  <Calendar style={{ color: '#1E40AF' }} className="mb-2" size={36} />
                  <h3 style={{ color: textColor }} className="font-medium mb-1">Previsão</h3>
                  <p style={{ color: textColor }} className="text-sm text-center">Previsão detalhada para os próximos 5 dias</p>
                </div>
                
                <div className="rounded-xl p-4 flex flex-col items-center" style={{
                  background: 'rgba(0, 0, 139, 0.1)'
                }}>
                  <Info style={{ color: '#1E40AF' }} className="mb-2" size={36} />
                  <h3 style={{ color: textColor }} className="font-medium mb-1">Detalhes</h3>
                  <p style={{ color: textColor }} className="text-sm text-center">Umidade, pressão, vento e mais detalhes meteorológicos</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-6 rounded-2xl shadow-xl" style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)'
            }}>
              <h3 style={{ color: textColor }} className="text-xl font-bold mb-4">Dicas Meteorológicas</h3>
              <div className="space-y-3">
                <div className="p-4 flex items-start rounded-xl" style={{
                  background: 'rgba(0, 0, 139, 0.1)'
                }}>
                  <Umbrella style={{ color: '#1E40AF' }} className="mr-3 mt-1 flex-shrink-0" size={20} />
                  <p style={{ color: textColor }}>Em dias chuvosos, sempre verifique a intensidade da chuva para se preparar adequadamente antes de sair de casa.</p>
                </div>
                <div className="p-4 flex items-start rounded-xl" style={{
                  background: 'rgba(0, 0, 139, 0.1)'
                }}>
                  <Sun style={{ color: '#1E40AF' }} className="mr-3 mt-1 flex-shrink-0" size={20} />
                  <p style={{ color: textColor }}>Proteja-se do sol com protetor solar, mesmo em dias nublados, pois os raios UV podem atravessar as nuvens.</p>
                </div>
                <div className="p-4 flex items-start rounded-xl" style={{
                  background: 'rgba(0, 0, 139, 0.1)'
                }}>
                  <Wind style={{ color: '#1E40AF' }} className="mr-3 mt-1 flex-shrink-0" size={20} />
                  <p style={{ color: textColor }}>Ventos fortes podem afetar a sensação térmica, fazendo com que pareça muito mais frio do que realmente está.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resultados do clima */}
        {dadosClima && !carregando && (
          <div className="max-w-4xl mx-auto">
            {/* Cidade e relógio */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <div className="flex items-center p-3 rounded-xl shadow-lg" style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)'
              }}>
                <div className="rounded-full p-2 mr-3" style={{
                  background: 'rgba(0, 0, 139, 0.3)'
                }}>
                  <MapPin style={{ color: textColor }} size={24} />
                </div>
                <h2 style={{ color: textColor }} className="text-2xl font-bold">{dadosClima.atual.cidade}</h2>
              </div>
              
              <div className="flex items-center p-3 rounded-xl shadow-lg" style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)'
              }}>
                <div className="rounded-full p-2 mr-3" style={{
                  background: 'rgba(0, 0, 139, 0.3)'
                }}>
                  <Clock style={{ color: textColor }} size={24} />
                </div>
                <div>
                  <div style={{ color: textColor }} className="text-2xl font-mono">
                    {horaAtual.toLocaleTimeString('pt-BR')}
                  </div>
                  <div style={{ color: textColor }} className="text-sm opacity-80">
                    {dadosClima.atual.timezone_name}
                  </div>
                </div>
              </div>
            </div>

            {/* Card do clima atual */}
            <div className="mb-6 rounded-2xl overflow-hidden shadow-xl" style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)'
            }}>
              <div className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="text-center md:text-left flex-1">
                    <div style={{ color: textColor }} className="mb-1 opacity-80">Agora</div>
                    <div style={{ color: textColor }} className="text-6xl font-bold mb-2">{dadosClima.atual.temperatura}°C</div>
                    <div style={{ color: textColor }} className="text-xl capitalize opacity-90">{dadosClima.atual.descricao}</div>
                    <div className="mt-2 inline-block px-3 py-1 rounded-full" style={{
                      background: 'rgba(0, 0, 139, 0.2)',
                      color: textColor
                    }}>
                      {dadosClima.atual.e_dia ? 'Dia' : 'Noite'}
                    </div>
                  </div>
                  
                  <div className="flex justify-center items-center w-40 h-40">
                    {getIconeAnimado(dadosClima.atual.descricao, dadosClima.atual.e_dia)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg flex items-center" style={{
                      background: 'rgba(0, 0, 139, 0.1)'
                    }}>
                      <Droplets style={{ color: '#1E40AF' }} className="mr-2" size={20} />
                      <div>
                        <div style={{ color: textColor }} className="text-sm opacity-70">Umidade</div>
                        <div style={{ color: textColor }} className="font-medium">{dadosClima.atual.umidade}%</div>
                      </div>
                    </div>
                    
                    <div className="p-3 rounded-lg flex items-center" style={{
                      background: 'rgba(0, 0, 139, 0.1)'
                    }}>
                      <Wind style={{ color: '#1E40AF' }} className="mr-2" size={20} />
                      <div>
                        <div style={{ color: textColor }} className="text-sm opacity-70">Vento</div>
                        <div style={{ color: textColor }} className="font-medium">{dadosClima.atual.vento} m/s</div>
                      </div>
                    </div>
                    
                    <div className="p-3 rounded-lg flex items-center" style={{
                      background: 'rgba(0, 0, 139, 0.1)'
                    }}>
                      <ThermometerSnowflake style={{ color: '#1E40AF' }} className="mr-2" size={20} />
                      <div>
                        <div style={{ color: textColor }} className="text-sm opacity-70">Sensação</div>
                        <div style={{ color: textColor }} className="font-medium">{dadosClima.atual.sensacao}°C</div>
                      </div>
                    </div>
                    
                    <div className="p-3 rounded-lg flex items-center" style={{
                      background: 'rgba(0, 0, 139, 0.1)'
                    }}>
                      <BarChart2 style={{ color: '#1E40AF' }} className="mr-2" size={20} />
                      <div>
                        <div style={{ color: textColor }} className="text-sm opacity-70">Pressão</div>
                        <div style={{ color: textColor }} className="font-medium">{dadosClima.atual.pressao} hPa</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção de previsão */}
            <div className="mb-6 rounded-2xl overflow-hidden shadow-xl" style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)'
            }}>
              <div 
                className="p-4 flex justify-between items-center cursor-pointer"
                onClick={() => alternarSecao('previsao')}
              >
                <h3 style={{ color: textColor }} className="text-xl font-bold">Previsão para Próximos Dias</h3>
                {secaoExpandida === 'previsao' ? (
                  <ChevronUp style={{ color: textColor }} />
                ) : (
                  <ChevronDown style={{ color: textColor }} />
                )}
              </div>
              
              {secaoExpandida === 'previsao' && (
                <div className="px-4 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {dadosClima.previsao.map((dia, index) => (
                      <div 
                        key={index} 
                        className="p-4 shadow-md rounded-xl"
                        style={{
                          background: 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(8px)'
                        }}
                      >
                        <div style={{ color: textColor, fontWeight: 'bold' }} className="mb-2">{dia.dia}</div>
                        <div className="flex justify-center my-3">
                          {getIconeClima(dia.descricao, dia.e_dia, 48)}
                        </div>
                        <div style={{ color: textColor }} className="text-center text-3xl font-bold mb-2">{dia.temp}°C</div>
                        <div style={{ color: textColor }} className="text-center text-sm mb-3 capitalize">{dia.descricao}</div>
                        <div className="flex justify-between text-sm" style={{ color: textColor }}>
                          <span>Min: {dia.temp_min}°C</span>
                          <span>Máx: {dia.temp_max}°C</span>
                        </div>
                        <div className="mt-2 text-center">
                          <span className="inline-block px-2 py-1 rounded-full text-xs" style={{
                            background: dia.e_dia 
                              ? 'rgba(0, 0, 139, 0.3)' 
                              : 'rgba(0, 0, 139, 0.4)',
                            color: textColor
                          }}>
                            {dia.e_dia ? 'Dia' : 'Noite'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Seção de detalhes da cidade */}
            <div className="mb-6 rounded-2xl overflow-hidden shadow-xl" style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)'
            }}>
              <div 
                className="p-4 flex justify-between items-center cursor-pointer"
                onClick={() => alternarSecao('cidade')}
              >
                <h3 style={{ color: textColor }} className="text-xl font-bold">Sobre a Cidade</h3>
                {secaoExpandida === 'cidade' ? (
                  <ChevronUp style={{ color: textColor }} />
                ) : (
                  <ChevronDown style={{ color: textColor }} />
                )}
              </div>
              
              {secaoExpandida === 'cidade' && (
                <div className="p-4">
                  <div className="rounded-xl p-4 leading-relaxed" style={{
                    background: 'rgba(0, 0, 139, 0.1)',
                    color: textColor
                  }}>
                    {dadosClima.cidade_info && dadosClima.cidade_info.sucesso ? (
                      <p>{dadosClima.cidade_info.resumo}</p>
                    ) : (
                      <p>Informações detalhadas sobre esta cidade não estão disponíveis no momento.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Seção de curiosidades */}
            <div className="mb-6 rounded-2xl overflow-hidden shadow-xl" style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)'
            }}>
              <div 
                className="p-4 flex justify-between items-center cursor-pointer"
                onClick={() => alternarSecao('curiosidades')}
              >
                <h3 style={{ color: textColor }} className="text-xl font-bold">Curiosidades Meteorológicas</h3>
                {secaoExpandida === 'curiosidades' ? (
                  <ChevronUp style={{ color: textColor }} />
                ) : (
                  <ChevronDown style={{ color: textColor }} />
                )}
              </div>
              
              {secaoExpandida === 'curiosidades' && dadosClima.curiosidades_meteo && dadosClima.curiosidades_meteo.sucesso && (
                <div className="p-4">
                  <div className="space-y-3">
                    {dadosClima.curiosidades_meteo.curiosidades.map((curiosidade, index) => (
                      <div key={index} className="rounded-xl p-4 flex items-start" style={{
                        background: 'rgba(0, 0, 139, 0.1)'
                      }}>
                        <Info style={{ color: '#1E40AF' }} className="mr-3 mt-1 flex-shrink-0" size={20} />
                        <p style={{ color: textColor }}>{curiosidade}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Resumo meteorológico */}
            <div className="rounded-2xl overflow-hidden shadow-xl" style={{
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)'
            }}>
              <div 
                className="p-4 flex justify-between items-center cursor-pointer"
                onClick={() => alternarSecao('resumo')}
              >
                <h3 style={{ color: textColor }} className="text-xl font-bold">Análise Meteorológica</h3>
                {secaoExpandida === 'resumo' ? (
                  <ChevronUp style={{ color: textColor }} />
                ) : (
                  <ChevronDown style={{ color: textColor }} />
                )}
              </div>
              
              {secaoExpandida === 'resumo' && (
                <div className="p-4">
                  <div className="rounded-xl p-4 whitespace-pre-line leading-relaxed" style={{
                    background: 'rgba(0, 0, 139, 0.1)',
                    color: textColor
                  }}>
                    {dadosClima.resumo}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Rodapé */}
      <footer className="mt-12 py-6" style={{
        background: 'rgba(0, 0, 139, 0.8)',
        backdropFilter: 'blur(8px)'
      }}>
        <div className="container mx-auto px-4 text-center text-white">
          <p>&copy; 2025 WeatherTime - Todos os direitos reservados</p>
          <p className="text-sm mt-2">Desenvolvido com ❤️ por sua equipe</p>
        </div>
      </footer>

      {/* Estilos adicionais para animações */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes twinkle {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.8; }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          
          @keyframes rain {
            0% { transform: translateY(-100%); opacity: 0.7; }
            100% { transform: translateY(100%); opacity: 0; }
          }
          
          @keyframes snow {
            0% { transform: translateY(-10px) rotate(0deg); opacity: 0.7; }
            100% { transform: translateY(100px) rotate(360deg); opacity: 0; }
          }
          
          @keyframes lightning {
            0%, 45%, 55%, 100% { opacity: 0; }
            50% { opacity: 1; }
          }
          
          @keyframes fog {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
};

export default WeatherTime;