import { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

export function PoolImport() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Por favor, selecione um arquivo Excel (.xlsx) válido.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${baseUrl}/pool-import/xlsx`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Erro desconhecido ao processar o arquivo.");
      }

      setResult(data.batch);
      setFile(null);
    } catch (err: any) {
      setError(err.message || "Erro de conexão ao enviar o arquivo.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto mt-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Importação de Pool</h1>
        <p className="text-gray-500 text-sm">Faça o upload da planilha Excel fornecida pelo cliente para gerar novas Ordens de Serviço.</p>
      </div>

      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-blue-600" />
            Nova Importação
          </CardTitle>
          <CardDescription>
            Selecione um arquivo .xlsx contendo as colunas padrão do template.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div 
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors ${file ? 'border-blue-300 bg-blue-50/50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
            onClick={!file ? handleUploadClick : undefined}
            style={{ cursor: !file ? 'pointer' : 'default' }}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
            />

            {!file ? (
              <>
                <div className="h-14 w-14 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-500">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">Clique ou arraste um arquivo para essa área</p>
                <p className="text-xs text-gray-500">Suporta apenas XLSX (Excel)</p>
              </>
            ) : (
              <>
                <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                  <FileSpreadsheet className="h-7 w-7" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1 truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-gray-500 mb-4">{(file.size / 1024).toFixed(1)} KB</p>
                <Button variant="outline" size="sm" onClick={() => setFile(null)} disabled={isUploading}>
                  Selecionar outro arquivo
                </Button>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg flex items-start gap-3 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm">
              <div className="flex items-center gap-2 font-semibold mb-2 text-emerald-900">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Importação Concluída: {result.status === "completed" ? "Sucesso Total" : "Com Falhas"}
              </div>
              <ul className="space-y-1 mt-3 grid grid-cols-2 gap-x-4">
                <li><strong className="font-medium">Total de linhas lidas:</strong> {result.counters?.totalRows}</li>
                <li><strong className="font-medium text-green-700">Novas ordens inseridas:</strong> {result.counters?.insertedRows}</li>
                <li><strong className="font-medium text-blue-700">Ordens atualizadas:</strong> {result.counters?.updatedRows}</li>
                <li><strong className="font-medium text-gray-600">Linhas ignoradas:</strong> {result.counters?.ignoredRows}</li>
                {result.counters?.errorRows > 0 && (
                  <li className="col-span-2 mt-2"><strong className="font-medium text-red-600">Com Erros/Falhas:</strong> {result.counters?.errorRows}</li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-gray-50/50 border-t p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => { setFile(null); setResult(null); setError(null); }} disabled={isUploading || (!file && !result)}>
            Limpar
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading} className="min-w-[120px]">
             {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Iniciar Importação"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
