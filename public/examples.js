/**
 * Demonstração editável identificada por datasetKind example. Usa as mesmas regras da operação, mas é persistida
 * em chave distinta da base real. Datas são relativas ao dia em que a demonstração é gerada.
 */
import { localDate, dayOffset } from './core.js';
import { blankState, stockEntry, validateState } from './domain.js';

/** Constrói a demonstração com notas de atendimento, orçamentos, tarefas e estoque coerentes; valida antes de devolver. */
export function exampleState() {
    const today = localDate(), d = n => dayOffset(n, today);
    let s = blankState();
    s.datasetKind = 'example';
    const c = {
        mariana: { name: 'Mariana Costa', phone: '(41) 90000-0001' },
        camila: { name: 'Camila Ribeiro', phone: '(41) 90000-0003' },
        juliana: { name: 'Juliana Martins', phone: '(41) 90000-0004' },
        fernanda: { name: 'Fernanda Lima', phone: '(41) 90000-0005' },
        ana: { name: 'Ana Clara Souza', phone: '(41) 90000-0006' },
        luiza: { name: 'Luiza Santos', phone: '(41) 90000-0007' },
        beatriz: { name: 'Beatriz Almeida', phone: '(41) 90000-0002' }
    };
    s.conversations = [
        { id: 'v1', contact: c.mariana, category: 'Segurança', status: 'open', time: '08:43', unread: true, summary: 'Mariana relatou sensibilidade após o procedimento de ontem. Precisa de avaliação direta da profissional.', messages: [{ text: 'Oi, Hanne! Senti sensibilidade no couro cabeludo depois do procedimento de ontem. Você pode falar comigo?', time: '08:43', type: 'incoming' }], draft: 'Oi, Mariana. Recebi seu relato e vou avaliar a situação com você. Pode me contar quando começou e como está agora?' },
        { id: 'v2', contact: c.camila, category: 'Orçamento', status: 'open', time: '08:35', unread: true, summary: 'Camila quer iluminar o cabelo. Ainda faltam o histórico químico e as referências para avaliação.', messages: [{ text: 'Bom dia! Queria saber mais sobre mechas e iluminação 😊', time: '08:34', type: 'incoming' }, { text: 'Você consegue me passar um orçamento?', time: '08:35', type: 'incoming' }], draft: 'Oi, Camila! Para eu avaliar seu pedido, você pode me contar quais procedimentos já fez no cabelo e enviar uma foto atual e suas referências?' },
        { id: 'v3', contact: c.juliana, category: 'Agendamento urgente', status: 'open', time: '08:22', unread: false, summary: 'Juliana pede para confirmar o horário combinado para hoje.', messages: [{ text: 'Hanne, pode conferir meu horário de hoje? Acho que anotei errado.', time: '08:22', type: 'incoming' }], draft: 'Oi, Juliana! Vou conferir e já te retorno.' },
        { id: 'v4', contact: c.fernanda, category: 'Pós-procedimento', status: 'open', time: '08:10', unread: false, summary: 'Fernanda pediu para relembrar os cuidados combinados na última visita.', messages: [{ text: 'Bom dia! Você pode me lembrar dos cuidados que combinamos na última visita?', time: '08:10', type: 'incoming' }], draft: '' },
        { id: 'v5', contact: c.luiza, category: 'Orçamento', status: 'waiting', time: 'Ontem', unread: false, summary: 'Luiza deseja um orçamento de coloração. Aguardando mais informações.', messages: [{ text: 'Gostaria de mudar a cor. Como funciona a avaliação?', time: '17:12', type: 'incoming' }], draft: '' },
        { id: 'v6', contact: c.beatriz, category: 'Informações gerais', status: 'resolved', time: 'Ontem', unread: false, summary: 'Beatriz recebeu as informações de chegada.', messages: [{ text: 'Obrigada, Hanne! Até amanhã.', time: '18:03', type: 'incoming' }], draft: '' }
    ];
    s.quotes = [
        { id: 'q1', contact: c.camila, origin: { type: 'note', id: 'v2' }, serviceId: 's3', status: 'missing', value: null, date: today, notes: 'Faltam histórico químico e referências.', question: 'Quais procedimentos você já fez no cabelo? Pode enviar uma foto atual e referências?', photos: [] },
        { id: 'q2', contact: c.luiza, origin: { type: 'note', id: 'v5' }, serviceId: 's2', status: 'review', value: null, date: d(-1), notes: 'Avaliar histórico antes de definir o procedimento e o valor.', question: '', photos: [] },
        { id: 'q3', contact: c.ana, origin: null, serviceId: 's3', status: 'approved', value: 480, date: d(-3), notes: 'Proposta avaliada manualmente pela profissional.', question: '', photos: [] }
    ];
    s.tasks = [
        { id: 't1', title: 'Avaliar relato da Mariana', area: 'Atendimento', priority: 'Alta', due: today, done: false, contact: c.mariana, origin: { type: 'note', id: 'v1' } },
        { id: 't2', title: 'Revisar orçamento da Camila', area: 'Orçamento', priority: 'Média', due: today, done: false, contact: c.camila, quoteId: 'q1', origin: null },
        { id: 't3', title: 'Repor máscara de tratamento', area: 'Estoque', priority: 'Média', due: d(2), done: false, contact: null, origin: null },
        { id: 't4', title: 'Conferir fotos do orçamento da Luiza', area: 'Orçamento', priority: 'Baixa', due: d(-1), done: false, contact: c.luiza, quoteId: 'q2', origin: null },
        { id: 't5', title: 'Atualizar catálogo de serviços', area: 'Serviços', priority: 'Baixa', due: d(-2), done: true, contact: null, origin: null }
    ];
    const products = [
        ['ex-shampoo', 'Shampoo de uso profissional', 'Marca exemplo', 'ml', 5000, 3200, 500, 0.036],
        ['ex-mask', 'Máscara de tratamento', 'Marca exemplo', 'g', 1000, 180, 150, 0.12],
        ['ex-color', 'Coloração · tom demonstrativo', 'Marca exemplo', 'g', 60, 300, 60, 0.7],
        ['ex-oxidant', 'Oxidante de uso profissional', 'Marca exemplo', 'ml', 1000, 650, 200, 0.045],
        ['ex-powder', 'Pó para iluminação', 'Marca exemplo', 'g', 500, 350, 260, 0.18],
        ['ex-leavein', 'Leave-in · custo a conferir', 'Marca exemplo', 'ml', 150, 90, 20, null]
    ];
    for (const [id, name, brand, unit, packageSize, quantity, minimum, unitCost] of products) {
        s.products.push({ id, name, brand, unit, packageSize, minimum });
        s.movements.push({ id: id + '-initial', productId: id, type: 'opening', date: d(-30), quantity, unitCost, note: 'Saldo inicial fictício' });
    }
    s = stockEntry(s, { id: 'ex-buy-color', productId: 'ex-color', type: 'purchase', date: d(-12), quantity: 120, total: 84, note: 'Compra de exemplo' });
    s = stockEntry(s, { id: 'ex-use-color', productId: 'ex-color', type: 'use', date: d(-5), quantity: 90, note: 'Uso em coloração' });
    s = stockEntry(s, { id: 'ex-use-oxidant', productId: 'ex-oxidant', type: 'use', date: d(-5), quantity: 120, note: 'Uso em coloração' });
    s = stockEntry(s, { id: 'ex-use-powder', productId: 'ex-powder', type: 'use', date: d(-2), quantity: 60, note: 'Uso em mechas' });
    s = stockEntry(s, { id: 'ex-loss-mask', productId: 'ex-mask', type: 'loss', date: d(-1), quantity: 40, note: 'Embalagem danificada' });
    return validateState(s);
}
