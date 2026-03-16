import { useState } from "react";
import { useManuals } from "@/hooks/useManuals";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedSkeleton } from "@/components/ui/animated-skeleton";
import { Plus, Trash2, BookOpen, ExternalLink, Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Manuals = () => {
  const { manuals, isLoading, createManual, deleteManual } = useManuals();
  const { isMaster } = useUserRole();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newManual, setNewManual] = useState({
    title: "",
    description: "",
    cover_url: "",
    file_url: "",
  });

  // Função robusta para extrair ID e gerar links que funcionam
  const getGoogleDriveDirectLink = (url: string, type: "image" | "file") => {
    if (!url) return "";

    // Regex para pegar o ID do arquivo (funciona com url longa, curta, id=, etc)
    // Ex: 1OUEML7iEoDCuOxVNNStM9sxtzVCGOcY4
    const idMatch = url.match(/[-\w]{25,}/);

    if (!idMatch) return url; // Se não achar ID, retorna original

    const id = idMatch[0];

    if (type === "image") {
      // TRUQUE 1: Usar lh3.googleusercontent.com para imagens.
      // Isso bypassa o bloqueio de exibição de imagens do Drive.
      // Adicionamos =w500 para redimensionar e economizar dados.
      return `https://lh3.googleusercontent.com/d/${id}=w500`;
    } else {
      // TRUQUE 2: Link direto de download.
      // O segredo está no atributo 'referrerPolicy' no elemento <a> abaixo, não só na URL.
      return `https://drive.google.com/uc?export=download&id=${id}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createManual({
      title: newManual.title,
      description: newManual.description || null,
      cover_url: newManual.cover_url,
      file_url: newManual.file_url,
    });
    if (success) {
      setNewManual({ title: "", description: "", cover_url: "", file_url: "" });
      setIsDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteManual(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Manuais
          </h1>
          <p className="text-muted-foreground">Central de materiais de apoio</p>
        </div>

        {isMaster && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Manual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Manual</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={newManual.title}
                    onChange={(e) => setNewManual({ ...newManual, title: e.target.value })}
                    placeholder="Ex: Manual de Inspeção Residencial"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newManual.description}
                    onChange={(e) => setNewManual({ ...newManual, description: e.target.value })}
                    placeholder="Breve descrição do conteúdo..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cover_url">Link da Capa (Google Drive) *</Label>
                  <Input
                    id="cover_url"
                    type="url"
                    value={newManual.cover_url}
                    onChange={(e) => setNewManual({ ...newManual, cover_url: e.target.value })}
                    placeholder="Cole o link de compartilhamento do Google Drive"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    O arquivo deve estar como "Qualquer pessoa com o link".
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file_url">Link do Arquivo (PDF) *</Label>
                  <Input
                    id="file_url"
                    type="url"
                    value={newManual.file_url}
                    onChange={(e) => setNewManual({ ...newManual, file_url: e.target.value })}
                    placeholder="Cole o link de compartilhamento do Google Drive"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Adicionar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <AnimatedSkeleton key={i} className="aspect-[3/4] rounded-lg" />
          ))}
        </div>
      ) : manuals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum manual disponível.
              {isMaster && ' Clique em "Adicionar Manual" para começar.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {manuals.map((manual) => {
            const directCoverUrl = getGoogleDriveDirectLink(manual.cover_url, "image");
            const directFileUrl = getGoogleDriveDirectLink(manual.file_url, "file");

            return (
              <div key={manual.id} className="group relative">
                <a
                  href={directFileUrl}
                  target="_blank"
                  rel="noopener noreferrer" // Padrão de segurança
                  referrerPolicy="no-referrer" // <--- O PULO DO GATO: Esconde a origem, evitando bloqueio do Google
                  className="block h-full"
                >
                  <Card className="overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer h-full flex flex-col bg-card/50 backdrop-blur-sm border-border/50">
                    <div className="aspect-[3/4] relative bg-muted/30 overflow-hidden">
                      {/* Placeholder de carregamento */}
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20 z-0">
                        <BookOpen className="h-12 w-12" />
                      </div>

                      <img
                        src={directCoverUrl}
                        alt={manual.title}
                        className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback se a imagem falhar (ex: link privado)
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/400x533/e2e8f0/1e293b?text=Sem+Capa";
                        }}
                      />

                      {/* Overlay de Download */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex items-end justify-center p-4">
                        <div className="flex items-center gap-2 text-white font-medium text-xs bg-primary px-3 py-1.5 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                          <Download className="h-3.5 w-3.5" />
                          <span>Baixar PDF</span>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-3 flex-1 flex flex-col">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1 text-foreground group-hover:text-primary transition-colors leading-tight">
                        {manual.title}
                      </h3>
                      {manual.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-auto">{manual.description}</p>
                      )}
                    </CardContent>
                  </Card>
                </a>

                {isMaster && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-30 shadow-md scale-90 hover:scale-100"
                        onClick={(e) => e.preventDefault()} // Previne disparar o link
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Manual</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover "{manual.title}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(manual.id);
                          }}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Manuals;
