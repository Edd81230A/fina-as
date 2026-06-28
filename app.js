import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCDxitzw-8CbxPbScbzn0TQLh1riw57NbI",
    authDomain: "controle-de-casa-672b3.firebaseapp.com",
    projectId: "controle-de-casa-672b3",
    storageBucket: "controle-de-casa-672b3.firebasestorage.app",
    messagingSenderId: "321605075333",
    appId: "1:321605075333:web:8561a8d1d5105aeea544ec"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Estados Globais
let transacoes = [];
let fixos = [];
const categoriasReceita = ['Salário', 'Investimentos', 'Bico', 'Rendimentos', 'Vendas', 'Outros'];
const categoriasDespesa = ['Contas (Água, Luz, Internet, Vivo)', 'Mercado (Mateus, etc.)', 'Investimentos (Inter, etc.)', 'Reserva de Emergência', 'Saúde/Farmácia', 'Combustível/Transporte', 'Saídas/Lazer', 'Aluguel/Moradia', 'Cartão de Crédito', 'Pix Transferência', 'Outros'];

// Sincronização com Firebase
onValue(ref(db, 'casa/transacoes'), (snapshot) => {
    transacoes = snapshot.val() || [];
    renderizarTudo();
});

onValue(ref(db, 'casa/fixos'), (snapshot) => {
    fixos = snapshot.val() || [];
    renderizarFixos();
});

function salvarBanco() {
    set(ref(db, 'casa/transacoes'), transacoes);
    set(ref(db, 'casa/fixos'), fixos);
}

// Funções de Renderização e Lógica (Expostas ao window)
window.renderizarTudo = () => { renderizarDashboard(); renderizarHistorico(); };

window.deletarTransacao = (id) => {
    if(confirm("Apagar registro?")) {
        transacoes = transacoes.filter(t => t.id !== id);
        salvarBanco();
    }
};

window.deletarFixo = (id) => {
    if(confirm("Remover dos lançamentos automáticos?")) {
        fixos = fixos.filter(f => f.id !== id);
        salvarBanco();
    }
};

window.abrirModalTransacao = (tipo) => {
    document.getElementById('mt-titulo').innerText = tipo === 'receita' ? 'Nova Receita' : 'Nova Despesa';
    document.getElementById('mt-tipo').value = tipo;
    document.getElementById('mt-data').value = new Date().toISOString().split('T')[0];
    const select = document.getElementById('mt-categoria');
    select.innerHTML = '';
    (tipo === 'receita' ? categoriasReceita : categoriasDespesa).forEach(c => select.innerHTML += `<option value="${c}">${c}</option>`);
    document.getElementById('modal-transacao').style.display = 'flex';
};

window.salvarTransacao = (e) => {
    e.preventDefault();
    const valor = parseFloat(document.getElementById('mt-valor').value.replace(',', '.'));
    if(isNaN(valor) || valor <= 0) return alert("Valor inválido!");
    transacoes.push({
        id: Math.random().toString(36).substring(2, 9),
        descricao: document.getElementById('mt-desc').value,
        valor: valor,
        data: document.getElementById('mt-data').value,
        categoria: document.getElementById('mt-categoria').value,
        tipo: document.getElementById('mt-tipo').value,
        isFixo: false
    });
    salvarBanco();
    fecharModais();
};

window.abrirModalFixo = () => {
    atualizarCategoriasFixas();
    document.getElementById('modal-fixo').style.display = 'flex';
};

window.atualizarCategoriasFixas = () => {
    const tipo = document.getElementById('mf-tipo').value;
    const select = document.getElementById('mf-categoria');
    select.innerHTML = '';
    (tipo === 'receita' ? categoriasReceita : categoriasDespesa).forEach(c => select.innerHTML += `<option value="${c}">${c}</option>`);
};

window.salvarFixo = (e) => {
    e.preventDefault();
    const valor = parseFloat(document.getElementById('mf-valor').value.replace(',', '.'));
    if(isNaN(valor) || valor <= 0) return alert("Valor inválido!");
    fixos.push({
        id: Math.random().toString(36).substring(2, 9),
        descricao: document.getElementById('mf-desc').value,
        valor: valor,
        categoria: document.getElementById('mf-categoria').value,
        tipo: document.getElementById('mf-tipo').value
    });
    salvarBanco();
    fecharModais();
};

window.fecharModais = () => {
    document.getElementById('modal-transacao').style.display = 'none';
    document.getElementById('modal-fixo').style.display = 'none';
};

window.mudarAba = (abaId, botao) => {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('ativo'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('ativo'));
    document.getElementById(abaId).classList.add('ativo');
    botao.classList.add('ativo');
    if(abaId === 'historico') renderizarHistorico();
};

// Funções internas (não precisam de window)
function formatarMoeda(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatarData(d) { const [a, m, dia] = d.split('-'); return `${dia}/${m}/${a}`; }

function renderizarDashboard() {
    const mes = new Date().toISOString().substring(0, 7);
    const ts = transacoes.filter(t => t.data.startsWith(mes));
    let r = 0, d = 0;
    const tbody = document.getElementById('tabela-dashboard');
    if(tbody) {
        tbody.innerHTML = ts.map(t => `<tr><td>${t.descricao}</td><td>${t.categoria}</td><td>${formatarData(t.data)}</td><td class="${t.tipo==='receita'?'valor-positivo':'valor-negativo'}">${t.tipo==='receita'?'+':'-'} ${formatarMoeda(t.valor)}</td><td><button class="btn-acao" onclick="deletarTransacao('${t.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('');
        ts.forEach(t => t.tipo === 'receita' ? r += t.valor : d += t.valor);
        document.getElementById('dash-receitas').innerText = formatarMoeda(r);
        document.getElementById('dash-despesas').innerText = formatarMoeda(d);
        document.getElementById('dash-saldo').innerText = formatarMoeda(r - d);
    }
}

function renderizarHistorico() {
    const mes = document.getElementById('filtro-mes-ano').value;
    const ts = transacoes.filter(t => t.data.startsWith(mes));
    const tbody = document.getElementById('tabela-historico');
    if(tbody) tbody.innerHTML = ts.map(t => `<tr><td>${formatarData(t.data)}</td><td>${t.descricao}</td><td>${t.categoria}</td><td class="${t.tipo==='receita'?'valor-positivo':'valor-negativo'}">${formatarMoeda(t.valor)}</td><td><button class="btn-acao" onclick="deletarTransacao('${t.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('');
}

function renderizarFixos() {
    const tbody = document.getElementById('tabela-fixos');
    if(tbody) tbody.innerHTML = fixos.map(f => `<tr><td>Dia 1º</td><td>${f.descricao}</td><td>${f.categoria}</td><td>${f.tipo}</td><td>${formatarMoeda(f.valor)}</td><td><button class="btn-acao" onclick="deletarFixo('${f.id}')"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('');
}