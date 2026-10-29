import React from 'react';
import { Link } from 'react-router-dom';
import LegalPageLayout from './components/LegalPageLayout';

import { EMAILS } from './config/brand';
/**
 * Mentions légales (LCEN, art. 6 III). Fill the empty strings below with the
 * real information of the micro-entreprise: nothing here is guessed, and a
 * field left empty shows up on the page as "à compléter" so it cannot be
 * published unnoticed.
 */
const LEGAL = {
  businessName: 'Linker Automation Tech',
  legalForm: 'Micro-entreprise (entreprise individuelle)',
  ownerName: '', // Nom et prénom de l'entrepreneur — aussi directeur de la publication
  siret: '', // SIREN / SIRET, 14 chiffres
  address: '', // Adresse de l'entreprise (siège)
  email: EMAILS.contact,
  phone: '',
  vatNote: '', // Ex. « TVA non applicable, art. 293 B du CGI » si vous êtes en franchise de TVA
  hostName: '', // Nom de l'hébergeur du site
  hostAddress: '', // Adresse de l'hébergeur
  hostPhone: '',
  mediatorName: '', // Médiateur de la consommation choisi
  mediatorUrl: '',
};

const Field = ({ value }: { value: string }) =>
  value.trim() ? (
    <>{value}</>
  ) : (
    <mark className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-semibold">à compléter</mark>
  );

export default function LegalNoticePage() {
  return (
    <LegalPageLayout title="Mentions légales" lastUpdated="29 octobre 2026" canonicalPath="/mentions-legales">
      <section>
        <h2>1. Éditeur du site</h2>
        <p>
          Le site et l'application Lettrup sont édités par <strong>{LEGAL.businessName}</strong>, {LEGAL.legalForm.toLowerCase()}.
        </p>
        <ul>
          <li>Entrepreneur : <Field value={LEGAL.ownerName} /></li>
          <li>SIREN / SIRET : <Field value={LEGAL.siret} /></li>
          <li>Adresse : <Field value={LEGAL.address} /></li>
          <li>
            E-mail : <a href={`mailto:${LEGAL.email}`} className="text-tertiary hover:underline">{LEGAL.email}</a>
          </li>
          <li>Téléphone : <Field value={LEGAL.phone} /></li>
          <li>TVA : <Field value={LEGAL.vatNote} /></li>
        </ul>
      </section>

      <section>
        <h2>2. Directeur de la publication</h2>
        <p>
          Le directeur de la publication est <Field value={LEGAL.ownerName} />, en qualité de représentant de {LEGAL.businessName}.
        </p>
      </section>

      <section>
        <h2>3. Hébergement</h2>
        <p>Le site est hébergé par :</p>
        <ul>
          <li>Hébergeur : <Field value={LEGAL.hostName} /></li>
          <li>Adresse : <Field value={LEGAL.hostAddress} /></li>
          <li>Téléphone : <Field value={LEGAL.hostPhone} /></li>
        </ul>
      </section>

      <section>
        <h2>4. Propriété intellectuelle</h2>
        <p>
          La marque, le logo, les textes, les modèles de documents, les interfaces et le code de Lettrup sont protégés par le
          droit de la propriété intellectuelle. Toute reproduction ou réutilisation sans autorisation écrite de {LEGAL.businessName} est
          interdite. Les documents que vous créez (CV, lettres, fiches d'entretien) restent les vôtres.
        </p>
      </section>

      <section>
        <h2>5. Données personnelles et cookies</h2>
        <p>
          Le traitement de vos données est décrit dans notre{' '}
          <Link to="/privacy" className="text-tertiary hover:underline">politique de confidentialité</Link> et notre{' '}
          <Link to="/cookie-policy" className="text-tertiary hover:underline">politique de cookies</Link>. Vous pouvez exercer vos droits
          (accès, rectification, suppression) en écrivant à l'adresse indiquée ci-dessus.
        </p>
      </section>

      <section>
        <h2>6. Médiation de la consommation</h2>
        <p>
          Conformément au Code de la consommation, tout consommateur peut recourir gratuitement à un médiateur en cas de litige
          non résolu avec {LEGAL.businessName}.
        </p>
        <ul>
          <li>Médiateur : <Field value={LEGAL.mediatorName} /></li>
          <li>Site : <Field value={LEGAL.mediatorUrl} /></li>
        </ul>
      </section>

      <section>
        <h2>7. Contenus générés par l'IA</h2>
        <p>
          Les CV, lettres et fiches d'entretien sont générés à partir des informations que vous fournissez. Relisez-les avant tout envoi :
          vous restez responsable de leur contenu et de leur exactitude.
        </p>
      </section>
    </LegalPageLayout>
  );
}
