import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, FolderOpen,
  GitCompare, Lightbulb, Search, ShieldCheck, Star
} from 'lucide-react';

const MODULES = [
  {
    number: '01',
    title: 'Busca / Onboarding',
    description: 'Cadastre um fornecedor pelo CNPJ, complete os dados e envie documentos para análise.',
    tip: 'Tenha o CNPJ e os documentos fiscais em mãos antes de iniciar.',
    to: '/onboarding',
    action: 'Iniciar cadastro',
    icon: Search,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    number: '02',
    title: 'Dossiê & Score',
    description: 'Consulte os dados cadastrais, os indicadores de risco e a pontuação consolidada.',
    tip: 'Pesquise pelo CNPJ usado no onboarding para abrir o dossiê correto.',
    to: '/dossier',
    action: 'Consultar dossiê',
    icon: FolderOpen,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    number: '03',
    title: 'Comparar Fornecedores',
    description: 'Compare lado a lado os scores e os principais critérios de fornecedores avaliados.',
    tip: 'Cadastre ao menos dois fornecedores para aproveitar a comparação.',
    to: '/compare',
    action: 'Fazer comparação',
    icon: GitCompare,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
  {
    number: '04',
    title: 'Fila Jurídico/RH',
    description: 'Revise fornecedores pendentes e registre a decisão de aprovação ou reprovação.',
    tip: 'Confira o dossiê e as evidências antes de concluir a decisão.',
    to: '/approvals',
    action: 'Ver fila',
    icon: ShieldCheck,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    number: '05',
    title: 'Pós-Aquisição',
    description: 'Registre a experiência real com prazo, preço e qualidade depois da entrega.',
    tip: 'O feedback recalcula o score e melhora o histórico do fornecedor.',
    to: '/feedback',
    action: 'Registrar feedback',
    icon: Star,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
];

export default function UserGuide() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 px-7 py-6 text-white shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              <ClipboardCheck size={13} /> Central de ajuda
            </span>
            <h2 className="mt-3 text-2xl font-semibold">Guia de Uso do Sistema PESA</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-blue-100">
              Siga o fluxo abaixo para cadastrar, analisar e acompanhar fornecedores durante todo o processo de homologação.
            </p>
          </div>
          <BarChart3 size={54} className="hidden sm:block text-blue-200/60" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <CheckCircle2 size={17} className="text-blue-600" /> Fluxo recomendado
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
          {['Cadastrar', 'Analisar score', 'Comparar', 'Aprovar', 'Avaliar entrega'].map((step, index) => (
            <React.Fragment key={step}>
              <span className="rounded-lg bg-slate-100 px-3 py-2">{index + 1}. {step}</span>
              {index < 4 && <ArrowRight size={14} className="text-slate-300" />}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h3 className="text-base font-semibold text-slate-800">Conheça os módulos</h3>
          <p className="mt-0.5 text-sm text-slate-500">Selecione uma ação para ir diretamente à função desejada.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MODULES.map(module => {
            const Icon = module.icon;
            return (
              <article key={module.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${module.bg}`}>
                    <Icon size={19} className={module.color} />
                  </div>
                  <span className="text-xs font-bold tracking-wider text-slate-300">{module.number}</span>
                </div>
                <h4 className="mt-4 text-sm font-semibold text-slate-800">{module.title}</h4>
                <p className="mt-1.5 flex-1 text-xs leading-5 text-slate-500">{module.description}</p>
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-4 text-slate-500">
                  <Lightbulb size={13} className="mt-0.5 flex-shrink-0 text-amber-500" />
                  <span>{module.tip}</span>
                </div>
                <Link to={module.to} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
                  {module.action} <ArrowRight size={13} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
