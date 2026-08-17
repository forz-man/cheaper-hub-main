"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function DealList({ deals }) {
  return (
    <Card>
      <CardHeader><CardTitle>Manually Added Deals</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Retailer</TableHead>
              <TableHead>Discount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map(deal => (
              <TableRow key={deal.id}>
                <TableCell>{deal.product_name}</TableCell>
                <TableCell>{deal.retailer}</TableCell>
                <TableCell><Badge>${(deal.original_price - deal.discounted_price).toFixed(2)} Off</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}