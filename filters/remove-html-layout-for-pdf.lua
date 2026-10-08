-- Remove Closeread's HTML-only overlay layout attribute before rendering to PDF.
function Div(el)
  if el.attributes["layout"] == "overlay-center" then
    el.attributes["layout"] = nil
  end

  return el
end
