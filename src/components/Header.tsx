export default function Header() {
    return (
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {/* Replace with actual Ruggable logo */}
              <img 
                src="/ruggable-logo.svg" 
                alt="Ruggable" 
                className="h-8"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }} 
              />
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="https://ruggable.co.uk/help" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Help Center
              </a>
            </div>
          </div>
        </div>
      </header>
    );
  }