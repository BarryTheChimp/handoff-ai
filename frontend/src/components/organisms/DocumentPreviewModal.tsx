import { useState, useEffect } from 'react';
import { X, FileText, Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { Modal } from '../atoms/Modal';
import { Spinner } from '../atoms/Spinner';

interface DocumentSection {
  id: string;
  title: string;
  content: string;
  level: number;
  order: number;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  specId: string;
  specName: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'md';
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  specId,
  specName,
  fileType,
}: DocumentPreviewModalProps) {
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isOpen || !specId) return;

    const fetchSections = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/specs/${specId}/sections`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Failed to load document sections');
        }

        const data = await response.json();
        setSections(data.data || []);
        if (data.data?.length > 0) {
          setSelectedSection(data.data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, [isOpen, specId]);

  const getFileIcon = () => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="text-red-400" size={20} />;
      case 'docx':
        return <FileText className="text-blue-400" size={20} />;
      default:
        return <FileText className="text-toucan-grey-400" size={20} />;
    }
  };

  const selectedSectionData = sections.find(s => s.id === selectedSection);
  const selectedIndex = sections.findIndex(s => s.id === selectedSection);

  const goToSection = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? selectedIndex - 1 : selectedIndex + 1;
    if (newIndex >= 0 && newIndex < sections.length && sections[newIndex]) {
      setSelectedSection(sections[newIndex].id);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
    >
      <div className={clsx(
        'flex flex-col',
        isFullscreen ? 'h-screen' : 'h-[80vh]'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-toucan-dark-border">
          <div className="flex items-center gap-3">
            {getFileIcon()}
            <div>
              <h2 className="text-lg font-medium text-toucan-grey-100">{specName}</h2>
              <p className="text-xs text-toucan-grey-500 uppercase">{fileType} Document</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-toucan-grey-400 hover:text-toucan-grey-200 hover:bg-toucan-dark rounded-md"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-toucan-grey-400 hover:text-toucan-grey-200 hover:bg-toucan-dark rounded-md"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-toucan-error mb-2">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-toucan-orange hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar - Table of Contents */}
            <div className="w-64 border-r border-toucan-dark-border overflow-y-auto bg-toucan-dark/50">
              <div className="p-3 border-b border-toucan-dark-border">
                <p className="text-xs font-medium text-toucan-grey-500 uppercase">Contents</p>
              </div>
              <div className="py-2">
                {sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={clsx(
                      'w-full text-left px-4 py-2 text-sm transition-colors',
                      'hover:bg-toucan-dark-lighter',
                      section.id === selectedSection
                        ? 'bg-toucan-orange/20 text-toucan-orange border-l-2 border-toucan-orange'
                        : 'text-toucan-grey-300',
                      section.level > 1 && 'pl-' + (4 + section.level * 2)
                    )}
                    style={{ paddingLeft: `${1 + section.level * 0.5}rem` }}
                  >
                    <span className="text-toucan-grey-600 mr-2">{index + 1}.</span>
                    <span className="truncate">{section.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Navigation */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-toucan-dark-border bg-toucan-dark/30">
                <button
                  onClick={() => goToSection('prev')}
                  disabled={selectedIndex <= 0}
                  className={clsx(
                    'flex items-center gap-1 px-3 py-1 rounded text-sm',
                    selectedIndex <= 0
                      ? 'text-toucan-grey-600 cursor-not-allowed'
                      : 'text-toucan-grey-400 hover:text-toucan-grey-200 hover:bg-toucan-dark'
                  )}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span className="text-sm text-toucan-grey-500">
                  Section {selectedIndex + 1} of {sections.length}
                </span>
                <button
                  onClick={() => goToSection('next')}
                  disabled={selectedIndex >= sections.length - 1}
                  className={clsx(
                    'flex items-center gap-1 px-3 py-1 rounded text-sm',
                    selectedIndex >= sections.length - 1
                      ? 'text-toucan-grey-600 cursor-not-allowed'
                      : 'text-toucan-grey-400 hover:text-toucan-grey-200 hover:bg-toucan-dark'
                  )}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedSectionData ? (
                  <div>
                    <h3 className="text-xl font-bold text-toucan-grey-100 mb-4">
                      {selectedSectionData.title}
                    </h3>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-toucan-grey-300 leading-relaxed">
                        {selectedSectionData.content}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-toucan-grey-500 py-8">
                    Select a section to preview
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
