import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { TemplateItem } from '../../TemplatesGallery';
import {
  ResumePreview,
  ResumeData,
  SectionId,
} from '../resume-preview/ResumePreview';
import { TEMPLATES } from '../../templates';

const DEFAULT_ORDERS: { single: SectionId[]; main: SectionId[]; side: SectionId[] } = {
  single: ['experience', 'education', 'competences', 'projets', 'langues', 'interets'],
  main: ['experience', 'education', 'projets'],
  side: ['competences', 'langues', 'interets'],
};

const A4_W = 794;
const A4_H = 1123;

export function buildSampleResumeDataForTemplate(template: TemplateItem): ResumeData {
  const name = template.candidateName || 'Claire Martin';
  const role = template.candidateRole || 'Cheffe de Projet';
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');

  const lowerRole = role.toLowerCase();
  const isTech = /développeur|developer|ingénieur|devops|data|it|systèmes|software|full/i.test(lowerRole);
  const isFinance = /comptab|finan|audit|contrôleur|juriste|avocat/i.test(lowerRole);
  const isDesignOrMktg = /design|ux|ui|marketing|communication|artistique|conception|édit/i.test(lowerRole);

  const profil = isTech
    ? `${role} avec 6 ans d’expérience dans la conception d’architectures cloud résilientes, le développement d’applications critiques et l’automatisation CI/CD.`
    : isFinance
      ? `${role} rigoureux·se avec 7 ans d’expérience en clôture des comptes, contrôle budgétaire, conformité réglementaire et accompagnement stratégique.`
      : isDesignOrMktg
        ? `${role} créatif·ve et orienté·e résultats, spécialisé·e en stratégie de marque, pilotage de campagnes omnicanales et expérience utilisateur.`
        : `${role} expérimenté·e, reconnu·e pour son leadership opérationnel, la coordination d’équipes pluridisciplinaires et l’amélioration continue des processus.`;

  const experience = isTech
    ? [
        {
          id: 'exp-1',
          company: 'TechCorp Solutions',
          jobTitle: role,
          startDate: 'Jan 2022',
          endDate: '',
          current: true,
          location: 'Paris',
          description:
            '<ul><li>Architecture et déploiement de services haute disponibilité (99,95 % SLA)</li><li>Réduction de 38 % des temps de réponse API et automatisation CI/CD</li><li>Encadrement technique de 5 développeurs et revues de code</li></ul>',
        },
        {
          id: 'exp-2',
          company: 'DataNova Labs',
          jobTitle: 'Ingénieur Études & Développement',
          startDate: 'Sept 2019',
          endDate: 'Déc 2021',
          current: false,
          location: 'Lyon',
          description:
            '<ul><li>Refonte modulaire du socle front-end et des pipelines de données</li><li>Mise en place des tests automatisés (couverture portée à 85 %)</li></ul>',
        },
      ]
    : isFinance
      ? [
          {
            id: 'exp-1',
            company: 'Cabinet Horizon & Associés',
            jobTitle: role,
            startDate: 'Jan 2022',
            endDate: '',
            current: true,
            location: 'Paris',
            description:
              '<ul><li>Supervision des clôtures mensuelles et annuelles d’un portefeuille de 30 sociétés</li><li>Établissement des bilans, liasses fiscales et tableaux de bord de trésorerie</li><li>Optimisation des processus de contrôle interne et conformité FEC</li></ul>',
          },
          {
            id: 'exp-2',
            company: 'Groupe Novalis',
            jobTitle: 'Chargé·e de Gestion & Audit',
            startDate: 'Sept 2018',
            endDate: 'Déc 2021',
            current: false,
            location: 'Nantes',
            description:
              '<ul><li>Suivi budgétaire, analyse des écarts et reporting mensuel sur SAP et Excel</li><li>Participation aux audits légaux et révision des cycles achats/ventes</li></ul>',
          },
        ]
      : [
          {
            id: 'exp-1',
            company: 'Groupe Horizon',
            jobTitle: role,
            startDate: 'Jan 2022',
            endDate: '',
            current: true,
            location: 'Paris',
            description:
              '<ul><li>Pilotage de la feuille de route stratégique et coordination d’une équipe de 8 personnes</li><li>Augmentation de +32 % des indicateurs de performance et de satisfaction client</li><li>Gestion d’un budget annuel de 450 k€ et suivi des prestataires</li></ul>',
          },
          {
            id: 'exp-2',
            company: 'Agence Lumière',
            jobTitle: 'Chargé·e de Projets Senior',
            startDate: 'Sept 2019',
            endDate: 'Déc 2021',
            current: false,
            location: 'Lyon',
            description:
              '<ul><li>Déploiement de 15 projets transverses dans le respect des délais et coûts</li><li>Mise en place d’outils collaboratifs et de tableaux de suivi KPI</li></ul>',
          },
        ];

  const education = isTech
    ? [
        {
          id: 'edu-1',
          institution: 'INSA / Université Paris-Saclay',
          degree: 'Master Ingénierie Logicielle & Data',
          date: '2017 - 2019',
        },
        {
          id: 'edu-2',
          institution: 'IUT de Lyon',
          degree: 'Licence Informatique',
          date: '2014 - 2017',
        },
      ]
    : isFinance
      ? [
          {
            id: 'edu-1',
            institution: 'Université Paris Dauphine-PSL',
            degree: 'Master CCA / Finance & Contrôle',
            date: '2016 - 2018',
          },
          {
            id: 'edu-2',
            institution: 'Université Panthéon-Sorbonne',
            degree: 'Licence Économie & Gestion',
            date: '2013 - 2016',
          },
        ]
      : [
          {
            id: 'edu-1',
            institution: 'Sciences Po / IAE Paris-Sorbonne',
            degree: 'Master Management & Stratégie',
            date: '2017 - 2019',
          },
          {
            id: 'edu-2',
            institution: 'Université de Bordeaux',
            degree: 'Licence Administration & Communication',
            date: '2014 - 2017',
          },
        ];

  const competences = isTech
    ? 'TypeScript / React\nNode.js / Python\nSQL & PostgreSQL\nDocker & Kubernetes\nArchitecture Cloud\nGit & CI/CD'
    : isFinance
      ? 'Comptabilité générale\nContrôle budgétaire\nNormes IFRS & Fiscalité\nSAP FI/CO & Sage\nExcel avancé (TCD, VBA)\nPower BI'
      : 'Gestion de projet Agile\nPilotage budgétaire & KPI\nManagement transversal\nStratégie & Conseil\nCommunication 360°\nSuite Microsoft 365 & CRM';

  return {
    coordonnees: {
      name,
      jobTitle: role,
      photoUrl: template.photoUrl || '',
      email: `${slug}@email.fr`,
      phone: '06 12 34 56 78',
      website: '',
      location: 'Paris, France',
      linkedin: `linkedin.com/in/${slug}`,
      github: '',
      drivingLicense: 'Permis B',
    },
    profil,
    experience,
    education,
    competences,
    langues: 'Français (Langue maternelle)\nAnglais (Courant C1)\nEspagnol (Professionnel B2)',
    interets: 'Veille sectorielle\nCourse à pied\nBénévolat associatif',
    projets: [
      {
        id: 'proj-1',
        name: 'Transformation & Optimisation Digitale',
        description: 'Automatisation des tableaux de bord et réduction de 25 % des délais de reporting.',
      },
    ],
  };
}

export default function CompactCvSample({
  template,
  accentColor,
  size = 'sm',
}: {
  template: TemplateItem;
  accentColor: string;
  size?: 'xs' | 'sm' | 'lg';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const defaultWidth = size === 'xs' ? 155 : size === 'lg' ? 560 : 190;
  const [scale, setScale] = useState<number>(defaultWidth / A4_W);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / A4_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sampleData = useMemo(() => buildSampleResumeDataForTemplate(template), [template]);
  const tplDef = TEMPLATES[template.id];
  const isTwoCol = !!(
    tplDef?.layoutVariant === 'left-sidebar' ||
    tplDef?.layoutVariant === 'two-column' ||
    tplDef?.sidebarContainer
  );
  const isCustomColor = accentColor && template.colors[0] && accentColor !== template.colors[0];

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-white select-none pointer-events-none"
    >
      {isCustomColor && (
        <div
          className="absolute inset-x-0 top-0 z-20 h-1"
          style={{ backgroundColor: accentColor }}
        />
      )}
      <div
        style={{
          width: A4_W,
          minHeight: A4_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <ResumePreview
          id={`cv-sample-${template.id}-${size}`}
          data={sampleData}
          template={template.id}
          layout={isTwoCol ? 'double' : 'single'}
          singleColumnOrder={DEFAULT_ORDERS.single}
          mainColumnOrder={DEFAULT_ORDERS.main}
          sideColumnOrder={DEFAULT_ORDERS.side}
        />
      </div>
    </div>
  );
}
