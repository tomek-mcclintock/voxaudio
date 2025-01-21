export default function Header() {
    return (
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {/* Option 1: If you have the logo file */}
              <img 
                src="/ruggable-logo.png" 
                alt="Ruggable" 
                className="h-8"
              />
            </div>
          </div>
        </div>
      </header>
    );
  }
  