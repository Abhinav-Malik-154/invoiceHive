const fs = require('fs');

const path = '../client/app/invoices/new/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// We need to inject a modal for client creation.

if(!content.includes('isClientModalOpen')) {
  // Add state to the top of the component:
  content = content.replace(
    /const \[discount, setDiscount\] = useState\("0"\);/,
    `const [discount, setDiscount] = useState("0");\n  const [isClientModalOpen, setIsClientModalOpen] = useState(false);\n  const [newClientName, setNewClientName] = useState("");\n  const [newClientEmail, setNewClientEmail] = useState("");`
  );

  // Add the mutation hook for creating a client
  if(!content.includes('useCreateClient')) {
      content = content.replace(/useClients, useCreateInvoice/, 'useClients, useCreateInvoice, useCreateClient');
  }
  
  content = content.replace(
    /const createMutation = useCreateInvoice\(\);/,
    `const createMutation = useCreateInvoice();\n  const createClientMutation = useCreateClient();\n\n  const handleCreateClient = async (e: React.FormEvent) => {\n    e.preventDefault();\n    try {\n      const newClient = await createClientMutation.mutateAsync({\n        name: newClientName,\n        email: newClientEmail,\n        status: "active"\n      });\n      setSelectedClient(newClient._id);\n      setIsClientModalOpen(false);\n      setNewClientName("");\n      setNewClientEmail("");\n    } catch (err: any) {\n      alert(err?.response?.data?.message || "Failed to create client");\n    }\n  };`
  );

  // Update the select dropdown to include "Add New Client..." option
  content = content.replace(
    /<select\s+className="w-full bg-transparent border-none text-sm focus:outline-none cursor-pointer"\s+value=\{selectedClient\}\s+onChange=\{\(e\) => setSelectedClient\(e.target.value\)\}\s+>/g,
    `<select\n                        className="w-full bg-transparent border-none text-sm focus:outline-none cursor-pointer"\n                        value={selectedClient}\n                        onChange={(e) => {\n                          if (e.target.value === "ADD_NEW") {\n                            setIsClientModalOpen(true);\n                            setSelectedClient("");\n                          } else {\n                            setSelectedClient(e.target.value);\n                          }\n                        }}\n                      >`
  );

  // Add "Add New Client..." option inside the select
  content = content.replace(
    /<option value="">-- Select a client --<\/option>/,
    `<option value="">-- Select a client --</option>\n                        <option value="ADD_NEW" className="font-semibold text-primary">+ Add New Client...</option>`
  );

  // Inject the Modal code at the end of the return statement, right before the last closing div.
  const modalHTML = `
      {/* ── Add New Client Modal ── */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
              <h2 className="text-lg font-semibold text-on-surface">Add New Client</h2>
              <button 
                onClick={() => setIsClientModalOpen(false)}
                className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateClient} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Client Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Email Address *</label>
                <input
                  required
                  type="email"
                  placeholder="billing@acmecorp.com"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createClientMutation.isPending}
                  className="px-5 py-2.5 text-sm font-medium bg-primary text-on-primary hover:bg-primary/90 shadow-sm rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {createClientMutation.isPending ? "Creating..." : "Save Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
  `;

  content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*$/g, `${modalHTML}\n    </div>\n  </div>\n</div>\n`);
  
  fs.writeFileSync(path, content, 'utf8');
  console.log("Success");
} else {
  console.log("Already updated");
}

