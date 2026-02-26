import { Branch } from '../../types/admin';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Building2 } from 'lucide-react';

interface BranchSelectorProps {
  selectedBranchId: number | null;
  onBranchChange: (branchId: number | null) => void;
  branches: Branch[];
  showAllOption?: boolean;
}

export function BranchSelector({ 
  selectedBranchId, 
  onBranchChange, 
  branches,
  showAllOption = true 
}: BranchSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-5 h-5 text-muted-foreground" />
      <Select
        value={selectedBranchId?.toString() || 'all'}
        onValueChange={(value) => onBranchChange(value === 'all' ? null : parseInt(value))}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Selecione uma filial" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">Todas as filiais</SelectItem>
          )}
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id.toString()}>
              {branch.name} ({branch.code})
              {!branch.is_active && ' - Inativa'}
              {!branch.is_open && branch.is_active && ' - Fechada'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
