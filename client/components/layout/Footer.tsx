export default function Footer() {
  return (
    <footer className="bg-slate-50 w-full py-12 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-lg font-bold text-slate-900 font-headline">InvoiceHive</span>
          <p className="text-xs text-slate-500">© 2024 InvoiceHive Premium Finance. All rights reserved.</p>
        </div>
        <div className="flex gap-8">
          {["Privacy Policy","Terms of Service","Security","Status","Contact"].map(l=>(
            <a key={l} href="#" className="text-slate-500 hover:text-primary text-xs transition-colors">{l}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}
