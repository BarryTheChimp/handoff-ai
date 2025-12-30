import { LucideIcon, LucideProps } from 'lucide-react';
import { clsx } from 'clsx';

// Re-export commonly used icons for convenience
export {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileText,
  GripVertical,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Save,
  Undo2,
  Redo2,
  ExternalLink,
  Upload,
  Download,
  Settings,
  Search,
  Filter,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Copy,
  Clipboard,
  Link2,
  Unlink,
  Split,
  Merge,
  LayoutList,
  FileCode,
  FileJson,
} from 'lucide-react';

export interface IconProps extends LucideProps {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
};

export function Icon({ icon: IconComponent, size = 'md', className, ...props }: IconProps) {
  return (
    <IconComponent
      size={sizeMap[size]}
      className={clsx('flex-shrink-0', className)}
      {...props}
    />
  );
}
