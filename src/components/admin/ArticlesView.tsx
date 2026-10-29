import React, { useState } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Star,
  BookOpen,
  Calendar,
  Clock,
  User,
  Tag,
  X,
  Check,
  Sparkles,
  MoveUp,
  MoveDown,
  Image,
  Quote,
  FileText,
  Share2,
  ArrowRight
} from 'lucide-react';
import { Article, Section } from './adminData';
import { AdminStore } from './adminStore';
import {
  deleteBlogArticleForAdmin,
  publishBlogArticleForAdmin,
  setBlogArticleFeaturedForAdmin,
} from '../../lib/adminApi';

interface ArticlesViewProps {
  articles: Article[];
  onRefresh: () => void | Promise<void>;
}

const DEFAULT_AUTHORS = [
  {
    name: 'Sonia Benali',
    role: 'RÉDACTRICE & AUTEURE',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    bio: 'Spécialiste des structures de recrutement et de la préparation aux entretiens dans les secteurs tech et exécutif.'
  },
  {
    name: 'Claire Delamare',
    role: 'CONSULTANTE RH & HEADHUNTER',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    bio: 'Experte en processus de sélection automatisés et refonte de candidatures exécutives.'
  },
  {
    name: 'Marc-Antoine Sorel',
    role: 'LEAD CAREER COACH',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    bio: 'Accompagnateur de carrière spécialisé dans les outils digitaux et le personal branding.'
  }
];

const SAMPLE_IMAGES = [
  { label: 'Entretien & Réunion', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Bureau & Traitement de texte', url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Technologie & Code', url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Écriture & Stylo', url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Équipe & Collaboration', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Analyse & Laptop', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80' }
];

const CATEGORIES_PRESETS = [
  'Guides de Rédaction',
  'Comparatifs',
  'Méthode & Entretien',
  'Gestion de Carrière'
];

export default function ArticlesView({ articles, onRefresh }: ArticlesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'form' | 'preview'>('form');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredArticles = articles.filter((art) => {
    const matchesSearch =
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.author.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || art.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCreateNew = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingArticle({
      id: `article-${Date.now()}`,
      title: '',
      subtitle: '',
      category: 'Guides de Rédaction',
      date: today,
      readTime: '5 min de lecture',
      excerpt: '',
      image: SAMPLE_IMAGES[0].url,
      quote: '',
      featured: false,
      author: DEFAULT_AUTHORS[0],
      tags: ['#CAREER', '#RECRUTEMENT'],
      sections: [
        {
          id: 'sec-1',
          title: '1. Introduction et Enjeux',
          content: 'Rédigez ici le premier paragraphe introductif de votre article...'
        },
        {
          id: 'conclusion',
          title: 'En Conclusion',
          content: 'Rédigez la conclusion synthétique...'
        }
      ]
    });
    setIsNew(true);
    setActiveModalTab('form');
  };

  const handleEdit = (art: Article) => {
    setEditingArticle(JSON.parse(JSON.stringify(art)));
    setIsNew(false);
    setActiveModalTab('form');
  };

  const handleDelete = async (art: Article) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'article "${art.title}" ?`)) {
      try {
        setIsSaving(true);
        await deleteBlogArticleForAdmin(art.id);
        AdminStore.logAction('DELETE_ARTICLE', 'Article', art.id, `Article "${art.title}" supprimé`);
        showToast(`Article "${art.title}" supprimé du blog.`);
        if (selectedArticle?.id === art.id) setSelectedArticle(null);
        await onRefresh();
      } catch (error) {
        alert(error instanceof Error ? error.message : "La suppression de l'article a échoué.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleToggleFeatured = async (art: Article) => {
    try {
      setIsSaving(true);
      await setBlogArticleFeaturedForAdmin(art.id, !art.featured);
      AdminStore.logAction(
        'TOGGLE_FEATURED_ARTICLE',
        'Article',
        art.id,
        `Statut "À la une" ${!art.featured ? 'activé' : 'désactivé'}`
      );
      showToast(`Statut "À la une" mis à jour pour "${art.title}".`);
      await onRefresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'La mise à la une a échoué.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!editingArticle || !editingArticle.title || !editingArticle.category) {
      alert('Veuillez remplir au moins le titre et la catégorie.');
      return;
    }

    const finalId =
      editingArticle.id ||
      editingArticle.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    const fullArticle: Article = {
      id: finalId,
      category: editingArticle.category || 'Guides de Rédaction',
      date: editingArticle.date || new Date().toISOString().split('T')[0],
      readTime: editingArticle.readTime || '5 min de lecture',
      title: editingArticle.title || '',
      subtitle: editingArticle.subtitle || '',
      excerpt: editingArticle.excerpt || '',
      image: editingArticle.image || SAMPLE_IMAGES[0].url,
      quote: editingArticle.quote || '',
      featured: !!editingArticle.featured,
      author: editingArticle.author || DEFAULT_AUTHORS[0],
      tags: editingArticle.tags || ['#CVPILOT'],
      sections: editingArticle.sections && editingArticle.sections.length > 0
        ? editingArticle.sections
        : [{ id: 'sec-1', title: '1. Introduction', content: "Contenu de l'article..." }]
    };

    try {
      setIsSaving(true);
      await publishBlogArticleForAdmin(fullArticle);
      AdminStore.logAction(
        isNew ? 'CREATE_ARTICLE' : 'EDIT_ARTICLE',
        'Article',
        fullArticle.id,
        `${isNew ? 'Nouvel article publié' : 'Article mis à jour'}: ${fullArticle.title}`
      );
      showToast(`Article "${fullArticle.title}" publié sur le blog.`);
      setEditingArticle(null);
      await onRefresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "La publication de l'article a échoué.");
    } finally {
      setIsSaving(false);
    }
  };

  // Section editor helpers
  const handleAddSection = () => {
    if (!editingArticle) return;
    const currentSections = editingArticle.sections || [];
    const newSec: Section = {
      id: `sec-${Date.now()}`,
      title: `${currentSections.length + 1}. Titre de la section`,
      content: 'Détail du paragraphe de la section...'
    };
    setEditingArticle({ ...editingArticle, sections: [...currentSections, newSec] });
  };

  const handleUpdateSection = (index: number, updatedSec: Section) => {
    if (!editingArticle) return;
    const current = [...(editingArticle.sections || [])];
    current[index] = updatedSec;
    setEditingArticle({ ...editingArticle, sections: current });
  };

  const handleDeleteSection = (index: number) => {
    if (!editingArticle) return;
    const current = [...(editingArticle.sections || [])];
    current.splice(index, 1);
    setEditingArticle({ ...editingArticle, sections: current });
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (!editingArticle || !editingArticle.sections) return;
    const current = [...editingArticle.sections];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const temp = current[index];
    current[index] = current[targetIdx];
    current[targetIdx] = temp;
    setEditingArticle({ ...editingArticle, sections: current });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl z-50 text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-2">
          <Check size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
              Contenu & Rédaction
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestion des Articles & Guides</h1>
          <p className="text-xs text-slate-500 mt-1">
            Rédigez, publiez, éditez ou mettez à la une des articles dans le blog public de l'application Lettrup.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs py-3 px-5 rounded-xl shadow-lg shadow-rose-600/20 active:scale-95 transition-all shrink-0"
        >
          <Plus size={16} />
          <span>Nouveau Article / Guide</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg shrink-0">
            <BookOpen size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{articles.length}</div>
            <div className="text-xs text-slate-500 font-medium">Articles Publiés</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg shrink-0">
            <Star size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {articles.filter((a) => a.featured).length}
            </div>
            <div className="text-xs text-slate-500 font-medium">À La Une (Featured)</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0">
            <User size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {Array.from(new Set(articles.map((a) => a.author.name))).length}
            </div>
            <div className="text-xs text-slate-500 font-medium">Auteurs Contributeurs</div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <Search className="text-slate-400 shrink-0" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un article par titre, auteur, extrait..."
            className="w-full text-xs bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-xs text-slate-400 hover:text-slate-700">
              Effacer
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Catégorie:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">Toutes les catégories</option>
            {CATEGORIES_PRESETS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Aperçu</th>
                <th className="py-3.5 px-4">Titre & Catégorie</th>
                <th className="py-3.5 px-4">Auteur</th>
                <th className="py-3.5 px-4">Publication</th>
                <th className="py-3.5 px-4">À la une</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredArticles.map((art) => (
                <tr key={art.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Thumbnail Image */}
                  <td className="py-3.5 px-4">
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img src={art.image} alt={art.title} className="w-full h-full object-cover" />
                    </div>
                  </td>

                  {/* Title & Category */}
                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                        {art.category}
                      </span>
                      {art.featured && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 flex items-center gap-1">
                          <Star size={10} className="fill-amber-500 text-amber-500" />
                          À la une
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-slate-900 text-xs line-clamp-1">{art.title}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{art.subtitle}</div>
                  </td>

                  {/* Author */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={art.author.avatar}
                        alt={art.author.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{art.author.name}</div>
                        <div className="text-[10px] text-slate-400">{art.author.role}</div>
                      </div>
                    </div>
                  </td>

                  {/* Date & Read Time */}
                  <td className="py-3.5 px-4">
                    <div className="text-slate-800 font-semibold">{art.date}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{art.readTime}</div>
                  </td>

                  {/* Toggle Featured */}
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleFeatured(art)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-colors ${
                        art.featured
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Star size={12} className={art.featured ? 'fill-amber-500 text-amber-500' : ''} />
                      <span>{art.featured ? 'Oui' : 'Non'}</span>
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedArticle(art)}
                        title="Aperçu rapide"
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        onClick={() => handleEdit(art)}
                        title="Éditer l'article"
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        onClick={() => handleDelete(art)}
                        title="Supprimer l'article"
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredArticles.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Aucun article ne correspond aux critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK PREVIEW MODAL */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-rose-400" />
                <span className="font-bold text-sm">Aperçu Administrateur de l'Article</span>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
              {/* Category & Title */}
              <div>
                <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-800 text-[10px] font-mono font-bold uppercase tracking-wider mb-2 inline-block">
                  {selectedArticle.category}
                </span>
                <h2 className="text-2xl font-black text-slate-900 mb-2">{selectedArticle.title}</h2>
                <p className="text-xs text-slate-500">{selectedArticle.subtitle}</p>
              </div>

              {/* Cover Image */}
              <div className="h-60 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Author & Date */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div className="flex items-center gap-2.5">
                  <img
                    src={selectedArticle.author.avatar}
                    alt={selectedArticle.author.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <div className="font-bold text-slate-900">{selectedArticle.author.name}</div>
                    <div className="text-[10px] text-slate-500">{selectedArticle.author.role}</div>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500 font-mono">
                  Publié le {selectedArticle.date} • {selectedArticle.readTime}
                </div>
              </div>

              {/* Quote */}
              {selectedArticle.quote && (
                <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-slate-800 italic text-xs font-serif rounded-r-xl">
                  "{selectedArticle.quote}"
                </div>
              )}

              {/* Sections */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Contenu ({selectedArticle.sections.length} sections)
                </h3>
                {selectedArticle.sections.map((sec) => (
                  <div key={sec.id} className="p-4 border border-slate-200 rounded-xl space-y-2">
                    <h4 className="font-bold text-sm text-slate-900">{sec.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{sec.content}</p>
                    {sec.bullets && sec.bullets.length > 0 && (
                      <ul className="space-y-1 mt-2 text-xs text-slate-700 font-mono bg-slate-50 p-2.5 rounded-lg">
                        {sec.bullets.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  const art = selectedArticle;
                  setSelectedArticle(null);
                  handleEdit(art);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5"
              >
                <Edit size={14} />
                <span>Éditer cet article</span>
              </button>
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ARTICLE MODAL */}
      {editingArticle && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {isNew ? 'Créer un Nouvel Article' : 'Éditer l\'Article'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Complétez la structure pour publier l'article dans le blog Lettrup
                  </p>
                </div>
              </div>

              {/* Tab Selector inside Modal (Form vs Live Preview) */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('form')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    activeModalTab === 'form'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Formulaire
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('preview')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    activeModalTab === 'preview'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Aperçu Direct
                </button>
              </div>

              <button
                type="button"
                onClick={() => setEditingArticle(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            {activeModalTab === 'form' ? (
              <form onSubmit={handleSaveArticle} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
                
                {/* Basic Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Titre de l'article <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingArticle.title || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                      placeholder="Ex: Comprendre et Appliquer la Méthode STAR à votre Entretien"
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none font-semibold text-slate-900"
                      required
                    />
                  </div>

                  {/* Subtitle */}
                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Sous-titre / Accroche</label>
                    <input
                      type="text"
                      value={editingArticle.subtitle || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, subtitle: e.target.value })}
                      placeholder="Ex: Décryptage étape par étape des 4 piliers comportementaux..."
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-slate-800"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Catégorie <span className="text-rose-500">*</span>
                    </label>
                    <div className="space-y-1.5">
                      <select
                        value={editingArticle.category || 'Guides de Rédaction'}
                        onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                        className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-slate-800"
                      >
                        {CATEGORIES_PRESETS.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        <option value="Autre">Autre catégorie sur mesure...</option>
                      </select>
                    </div>
                  </div>

                  {/* Read Time & Date */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Temps de lecture</label>
                      <input
                        type="text"
                        value={editingArticle.readTime || '5 min de lecture'}
                        onChange={(e) => setEditingArticle({ ...editingArticle, readTime: e.target.value })}
                        placeholder="Ex: 6 min de lecture"
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Date publication</label>
                      <input
                        type="date"
                        value={editingArticle.date || ''}
                        onChange={(e) => setEditingArticle({ ...editingArticle, date: e.target.value })}
                        className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Excerpt */}
                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Extrait (Résumé pour les cartes)</label>
                    <textarea
                      rows={2}
                      value={editingArticle.excerpt || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, excerpt: e.target.value })}
                      placeholder="Brève synthèse affichée sur la carte du blog..."
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>

                  {/* Cover Image & Presets */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="block font-bold text-slate-700">Image de couverture (URL Unsplash)</label>
                    <input
                      type="text"
                      value={editingArticle.image || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, image: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-slate-800"
                    />

                    {/* Quick Image Presets */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Raccourcis images:</span>
                      {SAMPLE_IMAGES.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setEditingArticle({ ...editingArticle, image: img.url })}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 border border-slate-200"
                        >
                          {img.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Highlight Quote */}
                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Citation mise en avant (Optionnel)</label>
                    <input
                      type="text"
                      value={editingArticle.quote || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, quote: e.target.value })}
                      placeholder="Ex: Le design ne doit jamais se faire au détriment de la lisibilité..."
                      className="w-full p-2.5 border border-slate-200 rounded-xl italic font-serif text-slate-800"
                    />
                  </div>

                  {/* Author Selector & Preset */}
                  <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Informations Auteur</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Auteur prédéfini:</span>
                        {DEFAULT_AUTHORS.map((aut) => (
                          <button
                            key={aut.name}
                            type="button"
                            onClick={() => setEditingArticle({ ...editingArticle, author: aut })}
                            className="px-2 py-1 rounded bg-white hover:bg-rose-50 text-[10px] font-bold text-slate-700 border border-slate-200 hover:border-rose-300"
                          >
                            {aut.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Nom de l'auteur</label>
                        <input
                          type="text"
                          value={editingArticle.author?.name || ''}
                          onChange={(e) =>
                            setEditingArticle({
                              ...editingArticle,
                              author: { ...(editingArticle.author || DEFAULT_AUTHORS[0]), name: e.target.value }
                            })
                          }
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Rôle / Titre</label>
                        <input
                          type="text"
                          value={editingArticle.author?.role || ''}
                          onChange={(e) =>
                            setEditingArticle({
                              ...editingArticle,
                              author: { ...(editingArticle.author || DEFAULT_AUTHORS[0]), role: e.target.value }
                            })
                          }
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-slate-600 font-semibold mb-1">Avatar URL</label>
                        <input
                          type="text"
                          value={editingArticle.author?.avatar || ''}
                          onChange={(e) =>
                            setEditingArticle({
                              ...editingArticle,
                              author: { ...(editingArticle.author || DEFAULT_AUTHORS[0]), avatar: e.target.value }
                            })
                          }
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Featured Checkbox & Tags */}
                  <div className="md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={!!editingArticle.featured}
                        onChange={(e) => setEditingArticle({ ...editingArticle, featured: e.target.checked })}
                        className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                      />
                      <span>Mettre à la une sur le blog ("Featured")</span>
                    </label>

                    <div className="flex-1 w-full sm:w-auto">
                      <label className="block font-bold text-slate-700 mb-1">Tags (séparés par une virgule)</label>
                      <input
                        type="text"
                        value={(editingArticle.tags || []).join(', ')}
                        onChange={(e) =>
                          setEditingArticle({
                            ...editingArticle,
                            tags: e.target.value.split(',').map((t) => t.trim())
                          })
                        }
                        placeholder="#MÉTHODE STAR, #ENTRETIEN, #CV"
                        className="w-full p-2 border border-slate-200 rounded-lg bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTIONS EDITOR */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">Sections de l'Article</h4>
                      <p className="text-[11px] text-slate-500">
                        Organisez le contenu en chapitres clairs avec titres, paragraphes et listes à puces.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus size={14} />
                      <span>Ajouter une Section</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(editingArticle.sections || []).map((sec, idx) => (
                      <div
                        key={sec.id || idx}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="font-mono font-bold text-[11px] text-slate-500 uppercase">
                            Section #{idx + 1}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveSection(idx, 'up')}
                              disabled={idx === 0}
                              title="Déplacer vers le haut"
                              className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30"
                            >
                              <MoveUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSection(idx, 'down')}
                              disabled={idx === (editingArticle.sections || []).length - 1}
                              title="Déplacer vers le bas"
                              className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30"
                            >
                              <MoveDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(idx)}
                              title="Supprimer la section"
                              className="p-1 hover:bg-rose-100 text-rose-600 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-600 font-semibold mb-1">Titre du chapitre</label>
                          <input
                            type="text"
                            value={sec.title}
                            onChange={(e) =>
                              handleUpdateSection(idx, { ...sec, title: e.target.value })
                            }
                            placeholder="Ex: 1. Pourquoi la méthode STAR séduit le Recrutement"
                            className="w-full p-2 border border-slate-200 rounded-lg bg-white font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 font-semibold mb-1">Paragraphe principal</label>
                          <textarea
                            rows={3}
                            value={sec.content}
                            onChange={(e) =>
                              handleUpdateSection(idx, { ...sec, content: e.target.value })
                            }
                            placeholder="Rédigez le texte détaillé..."
                            className="w-full p-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 font-semibold mb-1">
                            Puces d'explication (Optionnel, une puce par ligne)
                          </label>
                          <textarea
                            rows={2}
                            value={(sec.bullets || []).join('\n')}
                            onChange={(e) =>
                              handleUpdateSection(idx, {
                                ...sec,
                                bullets: e.target.value.split('\n').filter((l) => l.trim() !== '')
                              })
                            }
                            placeholder="• Point 1: Détail...&#10;• Point 2: Métrique..."
                            className="w-full p-2 border border-slate-200 rounded-lg bg-white font-mono text-[11px] text-slate-800"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingArticle(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-60 disabled:cursor-wait"
                  >
                    {isSaving ? 'Publication...' : isNew ? 'Publier l\'Article' : 'Sauvegarder les Modifications'}
                  </button>
                </div>
              </form>
            ) : (
              /* LIVE PREVIEW TAB IN MODAL */
              <div className="overflow-y-auto bg-slate-50 flex-1">
                <div className="max-w-5xl mx-auto p-6 sm:p-8">
                  <header className="text-center max-w-3xl mx-auto mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-600 text-xs font-mono font-extrabold uppercase tracking-widest mb-6">
                      {editingArticle.category || 'Catégorie'}
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4 leading-[1.15]">
                      {editingArticle.title || "Titre de l'article"}
                    </h1>

                    {editingArticle.subtitle && (
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8">
                        {editingArticle.subtitle}
                      </p>
                    )}

                    <div className="inline-flex items-center justify-center gap-4 flex-wrap text-xs text-slate-500 font-mono py-2 px-6 rounded-full bg-white border border-slate-200">
                      <div className="flex items-center gap-2">
                        <img
                          src={editingArticle.author?.avatar || DEFAULT_AUTHORS[0].avatar}
                          alt={editingArticle.author?.name || DEFAULT_AUTHORS[0].name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        />
                        <span className="font-bold text-slate-900">
                          {editingArticle.author?.name || DEFAULT_AUTHORS[0].name}
                        </span>
                        <span className="text-[10px] text-sky-600 font-sans font-semibold uppercase px-2 py-0.5 rounded bg-sky-50 border border-sky-200">
                          {editingArticle.author?.role || DEFAULT_AUTHORS[0].role}
                        </span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" />
                        <span>Publié le {editingArticle.date || new Date().toISOString().slice(0, 10)}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock size={13} className="text-slate-400" />
                        <span>{editingArticle.readTime || '5 min de lecture'}</span>
                      </div>
                    </div>
                  </header>

                  <div className="mb-12 rounded-3xl overflow-hidden border border-slate-200 shadow-xl h-52 sm:h-72 lg:h-80 relative bg-slate-100">
                    <img
                      src={editingArticle.image || SAMPLE_IMAGES[0].url}
                      alt={editingArticle.title || 'Aperçu'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 text-xs font-mono font-bold text-sky-600 uppercase tracking-wider">
                        <BookOpen size={14} />
                        <span>SOMMAIRE</span>
                      </div>
                      <nav className="space-y-2.5 text-xs text-slate-600 font-medium">
                        {(editingArticle.sections || []).map((sec) => (
                          <span key={sec.id} className="block py-1 border-l-2 border-transparent pl-2">
                            {sec.title}
                          </span>
                        ))}
                      </nav>
                    </aside>

                    <article className="lg:col-span-8 space-y-8 text-slate-600 leading-relaxed font-sans text-sm sm:text-base">
                      {editingArticle.quote && (
                        <blockquote className="p-6 sm:p-7 rounded-2xl bg-sky-50 border-l-4 border-sky-400 text-slate-900 italic font-serif text-base sm:text-lg leading-snug shadow-sm">
                          "{editingArticle.quote}"
                        </blockquote>
                      )}

                      {(editingArticle.sections || []).map((sec) => (
                        <section key={sec.id} className="space-y-3">
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-2">
                            {sec.title}
                          </h2>
                          <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                            {sec.content}
                          </p>
                          {sec.bullets && sec.bullets.length > 0 && (
                            <ul className="space-y-2 mt-3 pl-2 text-slate-600 text-xs sm:text-sm">
                              {sec.bullets.map((bullet, idx) => (
                                <li key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono">
                                  {bullet}
                                </li>
                              ))}
                            </ul>
                          )}
                        </section>
                      ))}

                      {(editingArticle.tags || []).length > 0 && (
                        <div className="pt-8 border-t border-slate-100">
                          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                            <span className="text-slate-500 font-bold uppercase mr-1">MOTS-CLÉS :</span>
                            {(editingArticle.tags || []).map((tag, idx) => (
                              <span key={idx} className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
