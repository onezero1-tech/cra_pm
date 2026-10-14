import JSZip from 'jszip';
import { workbookToBytes } from 'xlsx-kit/io';
import { createWorkbook, addWorksheet } from 'xlsx-kit/workbook';
import { setCell, setColumnWidth, mergeCells } from 'xlsx-kit/worksheet';
import { setBold } from 'xlsx-kit/styles';

/**
 * 创建用于 PM 拆分模式的演示数据文件与模板文件 (基于 xlsx-kit)
 */
export async function generateSplitSampleFiles(): Promise<{ dataFile: File; templateFile: File }> {
  // 1. 生成数据文件 (含 02-项目汇总表)
  const dataWb = createWorkbook();
  const ws = addWorksheet(dataWb, '02-项目汇总表');

  // 表头行 (row 1)
  const headers = [
    '序号', '提交日期', '部门', '项目编号', '中心名称',
    '阶段状态', '考核指标', '责任部门', '质量评分', '复核人',
    '所属组长'
  ];
  for (let c = 0; c < headers.length; c++) {
    const cell = setCell(ws, 1, c + 1, headers[c]);
    setBold(dataWb, cell);
  }

  const pms = ['张组长', '李组长', '王总监', '赵经理'];
  const projects = ['PRJ-2026-001', 'PRJ-2026-002', 'PRJ-2026-003', 'PRJ-2026-004', 'PRJ-2026-005'];
  const centers = ['北京协和医院', '上海瑞金医院', '广州中山一院', '四川华西医院', '武汉同济医院'];
  const stages = ['启动阶段', '入组阶段', '随访阶段', '关中心'];

  for (let i = 1; i <= 36; i++) {
    const pm = pms[i % pms.length];
    const prj = projects[i % projects.length];
    const center = centers[i % centers.length];
    const stage = stages[i % stages.length];
    const score = 85 + (i % 15);

    const rowVals = [
      i,
      '2026-03-15',
      '临床运营部',
      prj,            // Col 4 (1-based)
      center,         // Col 5 (1-based)
      stage,          // Col 6 (1-based)
      'GCP合规与访视时效',
      'CRA运营',
      score,          // Col 9 (1-based)
      '审核员A',
      pm              // Col 11 (1-based, 分组列)
    ];

    for (let c = 0; c < rowVals.length; c++) {
      setCell(ws, i + 1, c + 1, rowVals[c]);
    }
  }

  const dataBytes = await workbookToBytes(dataWb);
  const dataFile = new File([dataBytes as BlobPart], '示例_02项目质量汇总表.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // 2. 生成模板文件 (含工作表 A)
  const tplWb = createWorkbook();
  const tplWs = addWorksheet(tplWb, 'A');

  // 标题行
  mergeCells(tplWs, 'A1:C2');
  const titleCell = setCell(tplWs, 1, 1, '【临床试验质量评估明细单】');
  setBold(tplWb, titleCell);

  // 表头行 (row 3)
  const tplHeaders = ['中心名称', '试验阶段', '质量得分'];
  for (let c = 0; c < tplHeaders.length; c++) {
    const cell = setCell(tplWs, 3, c + 1, tplHeaders[c]);
    setBold(tplWb, cell);
  }

  // 样板行 (row 4)
  const tplSampleVals = ['样板中心', '样板阶段', 100];
  for (let c = 0; c < tplSampleVals.length; c++) {
    setCell(tplWs, 4, c + 1, tplSampleVals[c]);
  }

  setColumnWidth(tplWs, 1, 24);
  setColumnWidth(tplWs, 2, 18);
  setColumnWidth(tplWs, 3, 16);

  const tplBytes = await workbookToBytes(tplWb);
  const templateFile = new File([tplBytes as BlobPart], '示例_质量拆分模板.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return { dataFile, templateFile };
}

/**
 * 创建用于 PM 合并模式的演示压缩包 (基于 xlsx-kit)
 */
export async function generateMergeSampleZip(): Promise<File> {
  const zip = new JSZip();
  const regions = ['华东大区', '华北大区', '华南大区'];

  for (let idx = 0; idx < regions.length; idx++) {
    const region = regions[idx];
    const wb = createWorkbook();

    // 含有 HS 开头的工作表
    const ws1 = addWorksheet(wb, `HS-临床监查质量分`);
    setCell(ws1, 1, 1, '表头前置标题');
    setCell(ws1, 2, 1, '制表单位: GCP办公室');
    setCell(ws1, 3, 1, '制表日期: 2026-03-31'); // 前3行将被跳过

    // 第 4 行开始是数据，第 1 列将被丢弃，第 2 列开始保留
    for (let r = 1; r <= 8; r++) {
      const rowVals = [
        `废弃索引_${r}`, // Col 1 (dropped)
        `PROJ-2026-${100 + r}`, // Col 2 (key data)
        `${region}-中心0${r}`,
        `CRA专员0${r}`,
        88 + (r % 10),
        '合格',
      ];
      for (let c = 0; c < rowVals.length; c++) {
        setCell(ws1, r + 3, c + 1, rowVals[c]);
      }
    }

    const ws2 = addWorksheet(wb, `HS-自查评分表`);
    setCell(ws2, 1, 1, '无关行1');
    setCell(ws2, 2, 1, '无关行2');
    setCell(ws2, 3, 1, '无关行3');
    for (let r = 1; r <= 6; r++) {
      const rowVals = [
        `ID_${r}`,
        `PROJ-2026-${200 + r}`,
        `${region}-自查中心0${r}`,
        `主管0${r}`,
        92 + (r % 6),
        '优秀',
      ];
      for (let c = 0; c < rowVals.length; c++) {
        setCell(ws2, r + 3, c + 1, rowVals[c]);
      }
    }

    const bytes = await workbookToBytes(wb);
    const filename = `HS-Report-2026-03-${region}-第${idx + 1}季度.xlsx`;
    zip.file(filename, bytes);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return new File([zipBlob], '示例_PM合并压缩包.zip', { type: 'application/zip' });
}

/**
 * 创建用于 CRA 量表合并（横表与竖表）的演示包与模板 (基于 xlsx-kit)
 */
export async function generateCraSampleFiles(): Promise<{ archiveFile: File; templateFile: File }> {
  // 1. 创建标准模板 (含《填写指南》和《分数目录》)
  const tplWb = createWorkbook();

  // 《填写指南》: row 3 ~ 57, Col B = 工作内容, Col C = 别名
  const guideWs = addWorksheet(tplWb, '填写指南');
  setCell(guideWs, 1, 1, '说明');
  setCell(guideWs, 1, 2, '工作内容');
  setCell(guideWs, 1, 3, '别名/说明');

  const standardWorks = [
    ['肿瘤项目监查/访视', '肿瘤监查'],
    ['非肿瘤项目监查/访视', '非肿瘤监查'],
    ['中心启动访视', 'SIV启动'],
    ['常规监查访视', 'IMV常规'],
    ['关中心访视', 'COV关闭'],
    ['受试者招募跟进', '招募推进'],
    ['方案违背核查', '违背自查'],
    ['伦理审查递交', '伦理跟进'],
  ];

  for (let i = 0; i < standardWorks.length; i++) {
    const item = standardWorks[i];
    setCell(guideWs, i + 3, 2, item[0]);
    setCell(guideWs, i + 3, 3, item[1]);
  }

  // 《分数目录》: 项目编号, 等级, 分数
  const scoreWs = addWorksheet(tplWb, '分数目录');
  setCell(scoreWs, 1, 1, '序号');
  setCell(scoreWs, 1, 2, '项目编号');
  setCell(scoreWs, 1, 3, '等级');
  setCell(scoreWs, 1, 4, '分值');

  const projectsCatalog = [
    ['PRJ-ONCO-01', 'A', 15.0],
    ['PRJ-ONCO-02', 'B', 12.5],
    ['PRJ-NONONCO-01', 'A', 10.0],
    ['PRJ-NONONCO-02', 'C', 7.5],
  ];
  for (let i = 0; i < projectsCatalog.length; i++) {
    setCell(scoreWs, i + 2, 1, i + 1);
    setCell(scoreWs, i + 2, 2, projectsCatalog[i][0]);
    setCell(scoreWs, i + 2, 3, projectsCatalog[i][1]);
    setCell(scoreWs, i + 2, 4, projectsCatalog[i][2]);
  }

  const tplBytes = await workbookToBytes(tplWb);
  const templateFile = new File([tplBytes as BlobPart], '示例_CRA标准模板(含指南与分值).xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // 2. 创建多个 CRA 填写表单 Excel 并打包
  const zip = new JSZip();
  const craStaff = [
    { name: '王敏', dept: '华东一区', empId: 'CRA-1021' },
    { name: '陈峰', dept: '华北二区', empId: 'CRA-1022' },
    { name: '林静', dept: '华南一区', empId: 'CRA-1023' },
  ];

  for (const staff of craStaff) {
    const wb = createWorkbook();
    const ws = addWorksheet(wb, 'CRA填写表单');

    // Row 1: 基本信息 (偶数列是 key, 奇数列是 val)
    const row1Vals = [
      '姓名', staff.name,
      '工号', staff.empId,
      '部门', staff.dept,
      '填报月份', '2026-03'
    ];
    for (let c = 0; c < row1Vals.length; c++) {
      setCell(ws, 1, c + 1, row1Vals[c]);
    }

    // Row 2: 表头
    const row2Vals = [
      '序号', '工作内容', '分值', '项目编号', '中心名称',
      '备注信息', '计算规则', '次数/数量', '访视1', '访视2', '访视3'
    ];
    for (let c = 0; c < row2Vals.length; c++) {
      const cell = setCell(ws, 2, c + 1, row2Vals[c]);
      setBold(wb, cell);
    }

    // Row 3+: 实际工作项明细
    // 肿瘤监查项（将触发分数目录改写）
    const detailRows = [
      [1, '肿瘤项目监查/访视', 0, 'PRJ-ONCO-01', '北京协和医院', '已完成首例入组确认', '访视列计数', 2, 'V1筛选', 'V2给药', ''],
      [2, '非肿瘤项目监查/访视', 0, 'PRJ-NONONCO-01', '上海长海医院', '常规监查', '常规项', 3, '', '', ''],
      [3, '中心启动访视', 10, 'PRJ-ONCO-02', '广州第一人民医院', '启动培训顺利', '常规项', 1, '', '', ''],
      [4, '常规监查访视', 8, 'PRJ-NONONCO-02', '武汉协和医院', 'SDV完成度100%', '常规项', 4, '', '', ''],
      // 0 次数项（竖表模式下将被自动过滤，测试过滤逻辑）
      [5, '关中心访视', 5, 'PRJ-ONCO-01', '测试空中心', '尚未开展', '常规项', 0, '', '', ''],
    ];

    for (let r = 0; r < detailRows.length; r++) {
      const row = detailRows[r];
      for (let c = 0; c < row.length; c++) {
        setCell(ws, r + 3, c + 1, row[c]);
      }
    }

    const bytes = await workbookToBytes(wb);
    zip.file(`CRA填写表单_${staff.name}_202603.xlsx`, bytes);
  }

  const zipBytes = await zip.generateAsync({ type: 'blob' });
  const archiveFile = new File([zipBytes], '示例_CRA表单集合包.zip', {
    type: 'application/zip',
  });

  return { archiveFile, templateFile };
}
