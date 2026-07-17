import PDFDocument from 'pdfkit';

export function generateSalesReportPDF(
  stats: any,
  patterns: any,
  popularProducts: any[],
  reportType: 'summary' | 'category' | 'daily' = 'summary',
  allProductsForCategoryReport: any[] = []
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 }
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      if (reportType === 'category') {
        // ─── CATEGORY WISE SALES REPORT ───
        
        // 1. Branding & Header Banner
        doc.rect(40, 40, 515, 60).fill('#10b981'); // Emerald green for Category Report
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text('XONA POS - CATEGORY SALES REPORT', 55, 52);
        doc.fillColor('#e2e8f0').font('Helvetica').fontSize(9).text(`Generated Date: ${new Date().toLocaleString()}`, 55, 78);

        // Group products by category
        const categoriesMap: Record<string, any[]> = {};
        allProductsForCategoryReport.forEach(p => {
          const cat = p.category || 'Uncategorized';
          if (!categoriesMap[cat]) {
            categoriesMap[cat] = [];
          }
          categoriesMap[cat].push(p);
        });

        let catY = 120;
        const categories = Object.keys(categoriesMap);

        if (categories.length === 0) {
          doc.fillColor('#64748b').font('Helvetica').fontSize(10).text('No product records available in the database.', 40, catY);
        } else {
          categories.forEach((categoryName) => {
            const prods = categoriesMap[categoryName];
            const totalQty = prods.reduce((sum, p) => sum + (p.salesCount || 0), 0);
            const totalRev = prods.reduce((sum, p) => sum + ((p.salesCount || 0) * (p.price || 0)), 0);

            // Keep category header + first row together
            if (catY > 680) {
              doc.addPage();
              catY = 50;
            }

            // Category Title bar
            doc.rect(40, catY, 515, 20).fill('#f1f5f9');
            doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text(categoryName.toUpperCase(), 50, catY + 6);
            doc.fillColor('#64748b').font('Helvetica').fontSize(7.5).text(`(${prods.length} items, ${totalQty} units sold, Total Revenue: Rs. ${totalRev.toFixed(2)})`, 180, catY + 6.5);

            catY += 26;

            // Table headers
            doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7.5);
            doc.text('Product Name', 45, catY);
            doc.text('SKU / Code', 260, catY);
            doc.text('Item Price', 350, catY);
            doc.text('Qty Sold', 440, catY);
            doc.text('Revenue (LKR)', 500, catY);

            doc.moveTo(40, catY + 10).lineTo(555, catY + 10).strokeColor('#e2e8f0').stroke();
            catY += 15;

            prods.forEach((prod) => {
              if (catY > 750) {
                doc.addPage();
                catY = 50;
              }
              doc.fillColor('#0f172a').font('Helvetica').fontSize(8);
              doc.text(prod.name.substring(0, 36), 45, catY);
              doc.text(prod.sku, 260, catY);
              doc.text(`Rs. ${Number(prod.price).toFixed(2)}`, 350, catY);
              doc.text(String(prod.salesCount || 0), 440, catY);
              
              const itemRev = (prod.salesCount || 0) * (prod.price || 0);
              doc.fillColor('#059669').font('Helvetica-Bold').text(`Rs. ${itemRev.toFixed(2)}`, 500, catY);
              
              catY += 15;
            });

            catY += 15; // padding before next category
          });
        }

      } else if (reportType === 'daily') {
        // ─── DAILY SALES TIMELINE REPORT ───
        
        // 1. Branding & Header Banner
        doc.rect(40, 40, 515, 60).fill('#0ea5e9'); // Sky blue for Daily Report
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text('XONA POS - DAILY SALES TIMELINE', 55, 52);
        doc.fillColor('#e2e8f0').font('Helvetica').fontSize(9).text(`Generated Date: ${new Date().toLocaleString()}`, 55, 78);

        let dY = 120;
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Day-by-Day Transaction Analytics (Last 30 Days)', 40, dY);
        doc.moveTo(40, dY + 15).lineTo(555, dY + 15).strokeColor('#cbd5e1').stroke();

        // Table headers
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#64748b');
        doc.text('Date', 50, dY + 25);
        doc.text('Transactions Count', 180, dY + 25);
        doc.text('Total Daily Revenue', 320, dY + 25);
        doc.text('Average Transaction Value', 440, dY + 25);

        let rowY = dY + 38;
        const timeline = patterns.timeline.slice().reverse(); // Show newest dates first
        
        if (timeline.length === 0) {
          doc.fillColor('#64748b').font('Helvetica').fontSize(10).text('No transaction logs recorded in the database.', 40, rowY);
        } else {
          timeline.forEach((day: any, idx: number) => {
            if (rowY > 750) {
              doc.addPage();
              rowY = 50;
            }
            
            // Alternating row background
            doc.fillColor(idx % 2 === 0 ? '#f8fafc' : '#ffffff');
            doc.rect(40, rowY - 4, 515, 18).fill();

            doc.fillColor('#0f172a').font('Helvetica').fontSize(8.5);
            doc.text(day.date, 50, rowY);
            doc.text(String(day.count || 0), 180, rowY);
            doc.fillColor('#0ea5e9').font('Helvetica-Bold').text(`Rs. ${Number(day.revenue).toFixed(2)}`, 320, rowY);
            
            const avgOrderVal = (day.count && day.count > 0) ? (day.revenue / day.count) : 0;
            doc.fillColor('#64748b').font('Helvetica').text(`Rs. ${avgOrderVal.toFixed(2)}`, 440, rowY);

            rowY += 18;
          });
        }

      } else {
        // ─── OVERVIEW SUMMARY REPORT (Standard) ───

        // 1. Branding & Header Banner
        doc.rect(40, 40, 515, 60).fill('#8b5cf6'); // Purple
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text('XONA POS - SALES REPORT SUMMARY', 55, 52);
        doc.fillColor('#e2e8f0').font('Helvetica').fontSize(9).text(`Generated Date: ${new Date().toLocaleString()}`, 55, 78);

        // 2. Key Performance Indicators (KPIs)
        const kpiY = 120;
        
        // Card 1: Total Revenue
        doc.fillColor('#f8fafc').strokeColor('#e2e8f0');
        doc.roundedRect(40, kpiY, 160, 60, 6).fillAndStroke();
        doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8).text('TOTAL REVENUE', 50, kpiY + 10);
        doc.fillColor('#8b5cf6').fontSize(13).text(`Rs. ${Number(stats.transactions.totalRevenue).toFixed(2)}`, 50, kpiY + 28);

        // Card 2: Transactions
        doc.fillColor('#f8fafc').strokeColor('#e2e8f0');
        doc.roundedRect(217, kpiY, 160, 60, 6).fillAndStroke();
        doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8).text('TOTAL SALES', 227, kpiY + 10);
        doc.fillColor('#0f172a').fontSize(14).text(String(stats.transactions.total), 227, kpiY + 28);

        // Card 3: Top Category
        doc.fillColor('#f8fafc').strokeColor('#e2e8f0');
        doc.roundedRect(395, kpiY, 160, 60, 6).fillAndStroke();
        doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8).text('TOP CATEGORY', 405, kpiY + 10);
        const topCat = patterns.byCategory[0]?.category || 'None';
        doc.fillColor('#0f172a').fontSize(12).text(topCat.substring(0, 18), 405, kpiY + 28);

        // 3. Category Sales Share (Horizontal bar chart)
        const catY = 205;
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Sales Share by Category', 40, catY);
        doc.moveTo(40, catY + 17).lineTo(555, catY + 17).strokeColor('#cbd5e1').stroke();

        let currentY = catY + 30;
        const categoriesList = patterns.byCategory.slice(0, 5); // top 5
        const maxCategorySales = Math.max(...categoriesList.map((c: any) => c.count), 1);

        categoriesList.forEach((cat: any) => {
          doc.fillColor('#334155').font('Helvetica-Bold').fontSize(9).text(cat.category, 40, currentY + 2);
          
          // Bar chart background
          doc.rect(160, currentY, 300, 12).fill('#f1f5f9');
          // Colored bar chart
          const barWidth = (cat.count / maxCategorySales) * 300;
          if (barWidth > 0) {
            doc.rect(160, currentY, barWidth, 12).fill('#8b5cf6');
          }
          
          // Count text label
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text(`${cat.count} units`, 170 + barWidth, currentY + 2);
          currentY += 22;
        });

        // 4. Top Sold Products Table
        const tableStartY = 370;
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Top Sold Products', 40, tableStartY);
        doc.moveTo(40, tableStartY + 17).lineTo(555, tableStartY + 17).strokeColor('#cbd5e1').stroke();

        // Headers
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b');
        doc.text('Product Name', 45, tableStartY + 25);
        doc.text('SKU / Code', 260, tableStartY + 25);
        doc.text('Category', 350, tableStartY + 25);
        doc.text('Price', 440, tableStartY + 25);
        doc.text('Units Sold', 510, tableStartY + 25);

        let rowY = tableStartY + 38;
        popularProducts.slice(0, 7).forEach((prod: any, idx: number) => {
          // Alternating row background
          doc.fillColor(idx % 2 === 0 ? '#f8fafc' : '#ffffff');
          doc.rect(40, rowY - 4, 515, 18).fill();
          
          doc.fillColor('#0f172a').font('Helvetica').fontSize(8);
          doc.text(prod.name.substring(0, 32), 45, rowY);
          doc.text(prod.sku, 260, rowY);
          doc.text(prod.category, 350, rowY);
          doc.text(`Rs. ${Number(prod.price).toFixed(2)}`, 440, rowY);
          doc.fillColor('#10b981').font('Helvetica-Bold').text(String(prod.salesCount), 510, rowY);
          
          rowY += 18;
        });

        // ─── PAGE 2: DAILY REVENUE TIMELINE & PAYMENT OPTIONS ───
        doc.addPage();

        // Header Banner page 2
        doc.rect(40, 40, 515, 30).fill('#8b5cf6');
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text('XONA POS - REVENUE & PAYMENT ANALYTICS', 50, 51);

        // Section 1: Daily Revenue Timeline
        const timelineX = 40;
        const timelineY = 90;
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Daily Revenue Timeline (Last 30 Days)', timelineX, timelineY);
        doc.moveTo(timelineX, timelineY + 15).lineTo(320, timelineY + 15).strokeColor('#cbd5e1').stroke();

        let timeY = timelineY + 25;
        patterns.timeline.slice(0, 20).forEach((day: any, idx: number) => {
          // Alternating row background
          doc.fillColor(idx % 2 === 0 ? '#f8fafc' : '#ffffff');
          doc.rect(timelineX, timeY - 2, 280, 14).fill();

          doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8).text(day.date, timelineX + 5, timeY + 1);
          doc.fillColor('#8b5cf6').font('Helvetica-Bold').fontSize(8).text(`Rs. ${Number(day.revenue).toFixed(2)}`, timelineX + 160, timeY + 1);
          timeY += 14;
        });

        // Section 2: Payment Method Preferred Share
        const payX = 350;
        const payY = 90;
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Payment Methods Share', payX, payY);
        doc.moveTo(payX, payY + 15).lineTo(555, payY + 15).strokeColor('#cbd5e1').stroke();

        let itemPayY = payY + 25;
        patterns.byPaymentMethod.forEach((method: any, idx: number) => {
          doc.fillColor(idx % 2 === 0 ? '#f8fafc' : '#ffffff');
          doc.rect(payX, itemPayY - 4, 205, 22).fill();

          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text(method.method.toUpperCase(), payX + 5, itemPayY + 2);
          doc.fillColor('#64748b').font('Helvetica').fontSize(8).text(`${method.count} txn`, payX + 120, itemPayY + 3);
          itemPayY += 24;
        });
      }

      // Standard report footer
      doc.fontSize(7.5).fillColor('#94a3b8');
      doc.text('This is an automatically generated system snapshot report.', 40, doc.page.height - 35, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
