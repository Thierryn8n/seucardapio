import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold">Ops! Algo deu errado</h1>
              <p className="text-muted-foreground">
                Ocorreu um erro ao carregar a página. Isso pode acontecer ao navegar usando os botões do navegador.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-muted rounded-lg p-4 text-left">
                  <p className="text-sm font-mono text-destructive">
                    {this.state.error.message}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Button onClick={this.handleReload} className="w-full" size="lg">
                <RefreshCw className="w-4 h-4 mr-2" />
                Recarregar Aplicação
              </Button>
              <Button variant="outline" onClick={() => window.history.back()} className="w-full">
                Voltar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Dica: Use os links de navegação dentro da aplicação para evitar esse tipo de erro.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;