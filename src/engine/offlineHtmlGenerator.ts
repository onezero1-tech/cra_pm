/**
 * 离线单文件 HTML 应用导出生成器
 * 允许用户直接将整个现代化桌面界面与批处理引擎打包为一个单个 .html 文件下载并在本地离线使用
 */

export function downloadOfflineHtml(): void {
  // 从 public/ExcelMatrixPro_离线版.html 获取或直接以 Blob 导出
  fetch('/ExcelMatrixPro_离线版.html')
    .then(res => {
      if (!res.ok) throw new Error('读取静态离线文件失败');
      return res.blob();
    })
    .then(blob => {
      triggerDownload(blob, 'ExcelMatrixPro_离线单文件版.html');
    })
    .catch(() => {
      // 容灾直接构造
      const htmlContent = document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      triggerDownload(blob, 'ExcelMatrixPro_离线单文件版.html');
    });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}
