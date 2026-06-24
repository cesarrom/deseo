'use client';

import { useProducts } from '@deseo/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@deseo/ui/card';
import { Package, Globe, ArrowRight, Loader2, Search } from 'lucide-react';
import { Button } from '@deseo/ui/button';
import { Badge } from '@deseo/ui/badge';
import Link from 'next/link';
import { useClient } from '@/providers/client-provider';
import { Input } from '@deseo/ui/input';
import { useState } from 'react';

export default function ProductsPage() {
  const { activeClientId } = useClient();
  const [search, setSearch] = useState('');

  const { data: products, isLoading } = useProducts({ enabled: !!activeClientId });

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.domain.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Products</h1>
        <p className="text-slate-500">
          Domains discovered via Google Search Console. Connect GSC in the Marketplace to add more.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search products..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts?.map((product) => (
          <Card key={product.id} className="overflow-hidden hover:shadow-md transition-all group">
            <div className="h-1.5 bg-blue-600 w-0 group-hover:w-full transition-all duration-300" />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className="text-[10px] uppercase font-bold">{product.type}</Badge>
                <Globe className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <CardTitle className="text-xl mt-2 group-hover:text-blue-600 transition-colors">{product.name}</CardTitle>
              <CardDescription className="truncate text-sm font-mono">{product.domain}</CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <p className="text-xs text-slate-400 mt-2">
                Last updated {new Date(product.updatedAt).toLocaleDateString()}
              </p>
            </CardContent>
            <CardFooter className="bg-slate-50/50 p-3">
              <Button variant="ghost" size="sm" className="w-full justify-between group/btn" asChild>
                <Link href={`/dashboard/products/${product.id}`}>
                  View Console
                  <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}

        {filteredProducts?.length === 0 && search && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl bg-slate-50">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">No products match &quot;{search}&quot;</h3>
            <Button variant="outline" className="mt-6" onClick={() => setSearch('')}>
              Clear Search
            </Button>
          </div>
        )}

        {(!products || products.length === 0) && !search && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl bg-slate-50">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">No products yet</h3>
            <p className="text-slate-500 mt-1 max-w-xs mx-auto">
              Connect Google Search Console in the Marketplace — your verified domains will appear here automatically.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/dashboard/marketplace">Connect GSC</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
